using Api.Interfaces;
using Api.Interfaces.Services;
using Api.Models;
using Microsoft.EntityFrameworkCore;
using Api.Enums;
using Api.Representations;
using Api.Requests.WordTranslations;
using Translation = Api.Representations.Translation;
using Picture = Api.Representations.Picture;
using Newtonsoft.Json;
using System.Text;
using Api.Constants;
using Api.Representations.ThirdParty;

namespace Api.Services.BusinessLogic;

public class WordTranslationsService(
    TutorContext dbContext,
    ISecurityContext securityContext,
    IWordAiService aiService,
    ILanguageSettingsService languageSettingsService)
    : IWordTranslationsService
{
    private TutorContext DbContext { get; } = dbContext;
    private Guid UserId { get; } = Guid.Parse(securityContext.GetCurrentUserId());
    private IWordAiService AiService { get; } = aiService;
    private ILanguageSettingsService LanguageSettingsService { get; } = languageSettingsService;

    public async Task<WordSuggestionsRepresentation> SuggestTranslationsAsync(
        SuggestWordItemsRequest request)
    {
        var value = request.Value?.Trim();

        if (string.IsNullOrWhiteSpace(value))
            return new WordSuggestionsRepresentation();

        var suggestions = await AiService.SuggestTranslationsAsync(request.Language,
            request.TranslationLanguage, value, BuildExisting(request.Existing));

        return MapSuggestions(suggestions);
    }

    public async Task<WordSuggestionsRepresentation> SuggestUsagesAsync(
        SuggestWordItemsRequest request)
    {
        var value = request.Value?.Trim();

        if (string.IsNullOrWhiteSpace(value))
            return new WordSuggestionsRepresentation();

        var level = await LanguageSettingsService.GetLevelAsync(request.Language);

        var suggestions = await AiService.SuggestUsagesAsync(request.Language, level, value,
            BuildExisting(request.Existing));

        return MapSuggestions(suggestions);
    }

    private static List<string> BuildExisting(List<string> existing) =>
        (existing ?? [])
        .Select(item => item?.Trim())
        .Where(item => !string.IsNullOrWhiteSpace(item))
        .Distinct()
        .Take(GeneralConstants.WordSuggestionsExistingMaxCount)
        .ToList();

    private static WordSuggestionsRepresentation MapSuggestions(
        Ai.AiResult<Ai.AiWordSuggestions> suggestions) =>
        suggestions.IsSuccess
            ? new WordSuggestionsRepresentation
            {
                Items = suggestions.Value.Items
                    .Select(item => item?.Trim())
                    .Where(item => !string.IsNullOrWhiteSpace(item))
                    .Distinct()
                    .Take(GeneralConstants.WordSuggestionsMaxCount)
                    .ToList()
            }
            : new WordSuggestionsRepresentation { Error = suggestions.ErrorMessage };

    public async Task<Representations.Common.Page<WordTranslationsRepresentation>> SearchAsync(
        SearchWordTranslationsRequest request)
    {
        Representations.Common.Page<WordTranslationsRepresentation> result = new()
        {
            From = request.From,
            Count = request.Count
        };

        var wordsQuery = DbContext.Words
            .AsNoTracking()
            .Include(w => w.Translations)
            .ThenInclude(t => t.UserTranslations)
            .Include(w => w.Pictures)
            .ThenInclude(p => p.UserPictures)
            .Include(w => w.Usages)
            .ThenInclude(u => u.UserUsages)
            .Include(w => w.UserWordLearningProgresses)
            .Where(w => (string.IsNullOrWhiteSpace(request.Value) || EF.Functions.Like(w.Value, request.Value + "%")) &&
                        w.Language == request.Language &&
                        (request.FilterLearningProgresses.Contains(WordLearningProgress.Others) &&
                         w.UserWordLearningProgresses.All(uwlp => uwlp.UserId != UserId) ||
                         request.FilterLearningProgresses.Any(p => p != WordLearningProgress.Others) &&
                         EF.Constant(request.FilterLearningProgresses)
                             .Contains(w.UserWordLearningProgresses.First(uwlp => uwlp.UserId == UserId)
                                 .WordLearningProgress)));

        result.ItemsCount = await wordsQuery.CountAsync();

        wordsQuery = SortWordsQuery(wordsQuery, request);
        wordsQuery = wordsQuery.Skip(request.From).Take(request.Count);
        result.Items = wordsQuery.Select(w => new WordTranslationsRepresentation
        {
            Id = w.Id,
            Value = w.Value.ToLower(),
            WordLearningProgress = w.UserWordLearningProgresses.Any(uwlp => uwlp.UserId == UserId)
                ? w.UserWordLearningProgresses.First(uwlp => uwlp.UserId == UserId).WordLearningProgress
                : WordLearningProgress.Others,
            Language = request.Language,
            Translations = w.Translations.Where(t =>
                    w.UserWordLearningProgresses.Any(uwlp => uwlp.UserId == UserId) &&
                    t.UserTranslations.Any(ut => ut.UserId == UserId) ||
                    !w.UserWordLearningProgresses.Any(uwlp => uwlp.UserId == UserId))
                .OrderBy(t => t.UserTranslations.First(ut => ut.UserId == UserId).Position)
                .Select(t => new Translation
                {
                    Id = t.Id,
                    Enabled = true,
                    Position = w.UserWordLearningProgresses.Any(uwlp => uwlp.UserId == UserId)
                        ? t.UserTranslations.First(ut => ut.UserId == UserId).Position
                        : default,
                    UserTranslationId = w.UserWordLearningProgresses.Any(uwlp => uwlp.UserId == UserId)
                        ? t.UserTranslations.First(ut => ut.UserId == UserId).Id
                        : default,
                    Value = t.Value
                }).ToList(),
            Pictures = w.Pictures.Where(p =>
                    w.UserWordLearningProgresses.Any(uwlp => uwlp.UserId == UserId) &&
                    p.UserPictures.Any(up => up.UserId == UserId) ||
                    !w.UserWordLearningProgresses.Any(uwlp => uwlp.UserId == UserId))
                .OrderBy(p => p.UserPictures.First(up => up.UserId == UserId).Position)
                .Select(p => new Picture
                {
                    Id = p.Id,
                    Enabled = true,
                    Position = w.UserWordLearningProgresses.Any(uwlp => uwlp.UserId == UserId)
                        ? p.UserPictures.First(up => up.UserId == UserId).Position
                        : default,
                    UserPictureId = w.UserWordLearningProgresses.Any(uwlp => uwlp.UserId == UserId)
                        ? p.UserPictures.First(up => up.UserId == UserId).Id
                        : default
                }).ToList(),
            Usages = w.Usages.Where(u =>
                    w.UserWordLearningProgresses.Any(uwlp => uwlp.UserId == UserId) &&
                    u.UserUsages.Any(uu => uu.UserId == UserId) ||
                    !w.UserWordLearningProgresses.Any(uwlp => uwlp.UserId == UserId))
                .OrderBy(u => u.UserUsages.First(uu => uu.UserId == UserId).Position)
                .Select(u => new Representations.Usage
                {
                    Id = u.Id,
                    Enabled = true,
                    Position = w.UserWordLearningProgresses.Any(uwlp => uwlp.UserId == UserId)
                        ? u.UserUsages.First(uu => uu.UserId == UserId).Position
                        : default,
                    UserUsageId = w.UserWordLearningProgresses.Any(uwlp => uwlp.UserId == UserId)
                        ? u.UserUsages.First(uu => uu.UserId == UserId).Id
                        : default,
                    Value = u.Value
                }).ToList(),
            IsAnyNewPictureAvailable = w.UserWordLearningProgresses.Any(uwlp => uwlp.UserId == UserId) &&
                                       w.Pictures.Count != 0 && w.Pictures.All(p =>
                                           p.UserPictures.All(up => up.UserId != UserId)),
            AddingDate = w.UserWordLearningProgresses.Any(uwlp => uwlp.UserId == UserId)
                ? w.UserWordLearningProgresses.First(uwlp => uwlp.UserId == UserId).AddingDate
                : null,
            LastLearningDate = w.UserWordLearningProgresses.Any(uwlp => uwlp.UserId == UserId)
                ? w.UserWordLearningProgresses.First(uwlp => uwlp.UserId == UserId).LastLearningDate
                : null
        });

        return result;
    }

    public async Task<Dictionary<char, SuggestionRepresentation[]>> SuggestionsAsync(Language language)
    {
        var suggestions = await DbContext.Words
            .AsNoTracking()
            .Where(w => w.Language == language)
            .Select(w => new SuggestionRepresentation(
                w.Id,
                w.Value,
                w.UserWordLearningProgresses.FirstOrDefault(uwlp => uwlp.UserId == UserId) == null
                    ? null
                    : w.UserWordLearningProgresses.FirstOrDefault(uwlp => uwlp.UserId == UserId).WordLearningProgress
            ))
            .ToArrayAsync();

        return suggestions
                .OrderByDescending(s => s.LearningProgress)
                .ThenBy(s => s.Value)
                .GroupBy(s => char.ToLower(s.Value[0]))
                .ToDictionary(g => g.Key, g => g.ToArray());
    }

    public async Task AddPronunciationsAsync(Language language)
    {
        var words = await DbContext.Words
            .Where(w => w.Language == language && w.PronunciationData == null)
            .ToListAsync();

        var index = 0;
        var tasks = new List<Task>();

        do
        {
            tasks.Clear();
            var wordsBatch = words.Skip(index * 50).Take(50).ToList();

            foreach (var word in wordsBatch)
            {
                tasks.Add(AddPronunciationAsync(word, language));
            }

            Task.WaitAll([..tasks]);
            await DbContext.SaveChangesAsync();
            index++;

        } while (tasks.Count > 0);
    }

    public Task<WordTranslationsRepresentation> GetAsync(GetWordTranslationsRequest request)
    {
        return GetWordTranslationResponseAsync(request.Value, request.Language);
    }

    public async Task<WordTranslationsRepresentation> PutAsync(PutWordTranslationsRequest request,
        IFormFileCollection files, IFormFile pronunciation)
    {
        var word = await DbContext.Words
                       .Include(w => w.Translations)
                       .ThenInclude(t => t.UserTranslations)
                       .Include(w => w.Pictures)
                       .ThenInclude(t => t.UserPictures)
                       .Include(w => w.Usages)
                       .ThenInclude(u => u.UserUsages)
                       .Include(w => w.UserWordLearningProgresses)
                       .FirstOrDefaultAsync(w =>
                           w.Language == request.Language && (w.Id == request.Id || w.Value == request.Value)) ??
                   new Word
                   {
                       Value = request.Value.ToLower(),
                       Language = request.Language
                   };

        List<UserTranslation> userTranslationsToDelete = [];
        List<UserPicture> userPicturesToDelete = [];
        List<UserUsage> userUsagesToDelete = [];
        var now = DateTime.UtcNow;

        if (word.Id == default)
        {
            word.UserWordLearningProgresses.Add(new UserWordLearningProgress
            {
                UserId = UserId,
                WordLearningProgress = WordLearningProgress.None,
                AddingDate = now,
                LastLearningDate = now
            });
            DbContext.Words.Add(word);
        }
        else
        {
            var userWordLearningProgress =
                word.UserWordLearningProgresses.FirstOrDefault(uwlp => uwlp.UserId == UserId);

            if (userWordLearningProgress == null)
            {
                userWordLearningProgress = new UserWordLearningProgress
                {
                    UserId = UserId,
                    WordLearningProgress = WordLearningProgress.None,
                    AddingDate = now,
                    LastLearningDate = now
                };
                word.UserWordLearningProgresses.Add(userWordLearningProgress);
            }
            
            userWordLearningProgress.WordLearningProgress = request.WordLearningProgress;
            userWordLearningProgress.LastLearningDate = now;

            userTranslationsToDelete = word.Translations.SelectMany(t => t.UserTranslations)
                .Where(ut =>
                    ut.UserId == UserId && request.Translations.All(t => !t.Enabled || t.UserTranslationId != ut.Id))
                .ToList();
            DbContext.UserTranslations.RemoveRange(userTranslationsToDelete);

            userPicturesToDelete = word.Pictures.SelectMany(p => p.UserPictures)
                .Where(up =>
                    up.UserId == UserId && request.Pictures.All(p => !p.Enabled || p.UserPictureId != up.Id))
                .ToList();
            DbContext.UserPictures.RemoveRange(userPicturesToDelete);

            userUsagesToDelete = word.Usages.SelectMany(u => u.UserUsages)
                .Where(uu =>
                    uu.UserId == UserId && request.Usages.All(u => !u.Enabled || u.UserUsageId != uu.Id))
                .ToList();
            DbContext.UserUsages.RemoveRange(userUsagesToDelete);
        }

        SetDbUserTranslations(request, word);

        await SetDbUserPicturesAsync(request, word, files);

        SetDbUserUsages(request, word);

        var existingUserTranslations = word.Translations.SelectMany(t => t.UserTranslations)
            .Where(ut => ut.UserId == UserId && userTranslationsToDelete.All(uttd => uttd.Id != ut.Id))
            .OrderBy(ut => ut.Position).ToList();

        var existingUserPictures = word.Pictures.SelectMany(p => p.UserPictures)
            .Where(up => up.UserId == UserId && userPicturesToDelete.All(uptd => uptd.Id != up.Id))
            .OrderBy(up => up.Position).ToList();

        var existingUserUsages = word.Usages.SelectMany(u => u.UserUsages)
            .Where(uu => uu.UserId == UserId && userUsagesToDelete.All(uutd => uutd.Id != uu.Id))
            .OrderBy(uu => uu.Position).ToList();

        byte position = 0;
        foreach (var ut in existingUserTranslations)
            ut.Position = position++;

        position = 0;
        foreach (var up in existingUserPictures)
            up.Position = position++;

        position = 0;
        foreach (var uu in existingUserUsages)
            uu.Position = position++;

        if (pronunciation != null && request.UserUpload)
        {
            await SetPronunciationAsync(word, pronunciation);
        }
        else if (request.UserUpload && word.Id == default && pronunciation == null ||
            !request.UserUpload)
        {
            await AddPronunciationAsync(word, word.Language);
        }

        await DbContext.SaveChangesAsync();

        return await GetWordTranslationResponseAsync(request.Value, request.Language);
    }

    public async Task<bool> DeleteAsync(int wordId)
    {
        var userWordLearningProgresses = await DbContext.UserWordLearningProgresses
            .Where(uwlp => uwlp.UserId == UserId && uwlp.WordId == wordId)
            .ToArrayAsync();
        DbContext.UserWordLearningProgresses
            .RemoveRange(userWordLearningProgresses);

        var userPictures = await DbContext.UserPictures
            .Where(up => up.UserId == UserId && up.Picture.WordId == wordId)
            .ToArrayAsync();
        DbContext.UserPictures
            .RemoveRange(userPictures);

        var userTranslations = await DbContext.UserTranslations
            .Where(ut => ut.UserId == UserId && ut.Translation.WordId == wordId)
            .ToArrayAsync();
        DbContext.UserTranslations
            .RemoveRange(userTranslations);

        var userUsages = await DbContext.UserUsages
            .Where(uu => uu.UserId == UserId && uu.Usage.WordId == wordId)
            .ToArrayAsync();
        DbContext.UserUsages
            .RemoveRange(userUsages);

        await DbContext.SaveChangesAsync();

        return true;
    }

    public async Task<WordPronunciationRepresentation> GetWordPronunciationAsync(int wordId)
    {
        return await DbContext.Words
            .AsNoTracking()
            .Where(w => w.Id == wordId)
            .Select(w => new WordPronunciationRepresentation(w.PronunciationData, w.PronunciationContentType))
            .FirstOrDefaultAsync();
    }

    private IQueryable<Word> SortWordsQuery(IQueryable<Word> wordsQuery, SearchWordTranslationsRequest request)
    {
        var sortOrder = string.IsNullOrWhiteSpace(request.SortOrder)
            ? SortOrderConstants.Descending
            : request.SortOrder;

        var sortBy = string.IsNullOrWhiteSpace(request.SortBy)
            ? nameof(WordFieldConstants.AddingDate)
            : request.SortBy;

        return sortBy switch
        {
            _ when sortBy.Equals(nameof(WordFieldConstants.Value), StringComparison.OrdinalIgnoreCase) =>
                sortOrder.Equals(SortOrderConstants.Ascending, StringComparison.OrdinalIgnoreCase)
                    ? wordsQuery
                        .OrderBy(w => w.Value)
                        .ThenBy(w => w.Id)
                    : wordsQuery
                        .OrderByDescending(w => w.Value)
                        .ThenByDescending(w => w.Id),
            _ when sortBy.Equals(nameof(WordFieldConstants.WordLearningProgress), StringComparison.OrdinalIgnoreCase) =>
                sortOrder.Equals(SortOrderConstants.Ascending, StringComparison.OrdinalIgnoreCase)
                    ? wordsQuery.OrderBy(w =>
                            w.UserWordLearningProgresses.FirstOrDefault(uwlp => uwlp.UserId == UserId) == null
                                ? WordLearningProgress.Others
                                : w.UserWordLearningProgresses.FirstOrDefault(uwlp => uwlp.UserId == UserId).WordLearningProgress)
                        .ThenBy(w => w.Id)
                    : wordsQuery.OrderByDescending(w =>
                            w.UserWordLearningProgresses.FirstOrDefault(uwlp => uwlp.UserId == UserId) == null
                                ? WordLearningProgress.Others
                                : w.UserWordLearningProgresses.FirstOrDefault(uwlp => uwlp.UserId == UserId).WordLearningProgress)
                        .ThenByDescending(w => w.Id),
            _ when sortBy.Equals(nameof(WordFieldConstants.Pictures), StringComparison.OrdinalIgnoreCase) =>
                sortOrder.Equals(SortOrderConstants.Ascending, StringComparison.OrdinalIgnoreCase)
                    ? wordsQuery
                        .OrderBy(w => w.Pictures.Count(p => p.UserPictures.Any(up => up.UserId == UserId)))
                        .ThenBy(w => w.Pictures.Count)
                        .ThenBy(w => w.Id)
                    : wordsQuery
                        .OrderByDescending(w => w.Pictures.Count(p => p.UserPictures.Any(up => up.UserId == UserId)))
                        .ThenByDescending(w => w.Pictures.Count)
                        .ThenByDescending(w => w.Id),
            _ when sortBy.Equals(nameof(WordFieldConstants.AddingDate), StringComparison.OrdinalIgnoreCase) =>
                sortOrder.Equals(SortOrderConstants.Ascending, StringComparison.OrdinalIgnoreCase)
                    ? wordsQuery.OrderBy(w =>
                            w.UserWordLearningProgresses.FirstOrDefault(uwlp => uwlp.UserId == UserId) == null
                                ? new DateTime()
                                : w.UserWordLearningProgresses.FirstOrDefault(uwlp => uwlp.UserId == UserId).AddingDate)
                        .ThenBy(w => w.Id)
                    : wordsQuery.OrderByDescending(w =>
                            w.UserWordLearningProgresses.FirstOrDefault(uwlp => uwlp.UserId == UserId) == null
                                ? new DateTime()
                                : w.UserWordLearningProgresses.FirstOrDefault(uwlp => uwlp.UserId == UserId).AddingDate)
                        .ThenByDescending(w => w.Id),
            _ when sortBy.Equals(nameof(WordFieldConstants.LastLearningDate), StringComparison.OrdinalIgnoreCase) =>
                sortOrder.Equals(SortOrderConstants.Ascending, StringComparison.OrdinalIgnoreCase)
                    ? wordsQuery.OrderBy(w =>
                            w.UserWordLearningProgresses.FirstOrDefault(uwlp => uwlp.UserId == UserId) == null
                                ? new DateTime()
                                : w.UserWordLearningProgresses.FirstOrDefault(uwlp => uwlp.UserId == UserId).LastLearningDate)
                        .ThenBy(w => w.Id)
                    : wordsQuery.OrderByDescending(w =>
                            w.UserWordLearningProgresses.FirstOrDefault(uwlp => uwlp.UserId == UserId) == null
                                ? new DateTime()
                                : w.UserWordLearningProgresses.FirstOrDefault(uwlp => uwlp.UserId == UserId).LastLearningDate)
                        .ThenByDescending(w => w.Id),
            _ => wordsQuery
        };
    }

    private async Task<WordTranslationsRepresentation> GetWordTranslationResponseAsync(string value, Language language)
    {
        var word = await DbContext.Words
            .Where(w => w.Language == language)
            .Include(w => w.Translations)
            .ThenInclude(t => t.UserTranslations)
            .Include(w => w.Pictures)
            .ThenInclude(t => t.UserPictures)
            .Include(w => w.Usages)
            .ThenInclude(u => u.UserUsages)
            .Include(w => w.UserWordLearningProgresses.Where(uwlp => uwlp.UserId == UserId))
            .FirstOrDefaultAsync(w => w.Value == value);

        var userWordLearningProgress = word?.UserWordLearningProgresses.FirstOrDefault(uwlp => uwlp.UserId == UserId);

        var result = new WordTranslationsRepresentation
        {
            Id = word?.Id ?? default,
            Value = value.ToLower(),
            WordLearningProgress = userWordLearningProgress?.WordLearningProgress ??
                                   WordLearningProgress.None,
            Language = language,
            HasPronunciation = word?.PronunciationData != null
        };

        if (word == null)
            return result;

        SetRepresentationTranslations(result, word);

        SetRepresentationPictures(result, word);

        SetRepresentationUsages(result, word);

        return result;
    }

    private void SetDbUserTranslations(PutWordTranslationsRequest request, Word word)
    {
        foreach (var translation in request.Translations.Where(t => t.Enabled))
        {
            if (translation.Id == default)
                word.Translations.Add(new Models.Translation
                {
                    Value = translation.Value,
                    UserTranslations =
                    [
                        new()
                        {
                            UserId = UserId,
                            Position = translation.Position,
                        }
                    ]
                });
            else
            {
                var existingTranslation = word.Translations.First(t => t.Id == translation.Id);
                existingTranslation.Value = translation.Value;
                var userTranslation = existingTranslation.UserTranslations.FirstOrDefault(ut => ut.UserId == UserId);
                userTranslation ??= new()
                {
                    UserId = UserId
                };
                userTranslation.Position = translation.Position;
                if (userTranslation.Id == default)
                    existingTranslation.UserTranslations.Add(userTranslation);
            }
        }
    }

    private static async Task SetPronunciationAsync(Word word, IFormFile pronunciation)
    {
        if (pronunciation == null) 
            return;

        byte[] data;
        using (var ms = new MemoryStream())
        {
            await pronunciation.CopyToAsync(ms);
            data = ms.ToArray();
        }

        word.PronunciationData = data;
        word.PronunciationContentType = pronunciation.ContentType.ToLower();
        word.PronunciationExtension = Path.GetExtension(pronunciation.FileName).Replace(".", "").ToLower();
        word.PronunciationLength = pronunciation.Length;
    }

    private async Task SetDbUserPicturesAsync(PutWordTranslationsRequest request, Word word, IFormFileCollection files)
    {
        var newFileIndex = 0;

        foreach (var picture in request.Pictures.Where(t => t.Enabled))
        {
            if (picture.Id == default)
            {
                var file = files[newFileIndex++];
                byte[] data;

                using (var ms = new MemoryStream())
                {
                    await file.CopyToAsync(ms);
                    data = ms.ToArray();
                }

                word.Pictures.Add(new Models.Picture
                {
                    Data = data,
                    ContentType = file.ContentType.ToLower(),
                    Extension = Path.GetExtension(file.FileName).Replace(".", "").ToLower(),
                    Length = file.Length,
                    UserPictures =
                    [
                        new()
                        {
                            UserId = UserId,
                            Position = picture.Position,
                        }
                    ]
                });
            }
            else
            {
                var existingPicture = word.Pictures.First(p => p.Id == picture.Id);
                var userPicture = existingPicture.UserPictures.FirstOrDefault(up => up.UserId == UserId);
                userPicture ??= new()
                {
                    UserId = UserId
                };
                userPicture.Position = picture.Position;
                if (userPicture.Id == default)
                    existingPicture.UserPictures.Add(userPicture);
            }
        }
    }

    private void SetDbUserUsages(PutWordTranslationsRequest request, Word word)
    {
        foreach (var usage in request.Usages.Where(u => u.Enabled))
        {
            if (usage.Id == default)
                word.Usages.Add(new Models.Usage
                {
                    Value = usage.Value,
                    UserUsages =
                    [
                        new()
                        {
                            UserId = UserId,
                            Position = usage.Position,
                        }
                    ]
                });
            else
            {
                var existingUsage = word.Usages.First(u => u.Id == usage.Id);
                existingUsage.Value = usage.Value;
                var userUsage = existingUsage.UserUsages.FirstOrDefault(uu => uu.UserId == UserId);
                userUsage ??= new()
                {
                    UserId = UserId
                };
                userUsage.Position = usage.Position;
                if (userUsage.Id == default)
                    existingUsage.UserUsages.Add(userUsage);
            }
        }
    }

    private void SetRepresentationTranslations(WordTranslationsRepresentation result, Word word)
    {
        result.Translations.AddRange(word.Translations.Where(t => t.UserTranslations.Any(ut => ut.UserId == UserId))
            .Select(dbTranslation =>
                new Translation
                {
                    Id = dbTranslation.Id,
                    UserTranslationId = dbTranslation.UserTranslations.First(ut => ut.UserId == UserId).Id,
                    Enabled = true,
                    Position = dbTranslation.UserTranslations.First(ut => ut.UserId == UserId).Position,
                    Value = dbTranslation.Value
                }));

        byte position = (byte)(result.Translations.Count == 0 ? 0 : result.Translations.Max(t => t.Position) + 1);

        var otherUsersTranslations = word.Translations
            .Where(t => t.UserTranslations.Count == 0 || t.UserTranslations.All(ut => ut.UserId != UserId))
            .ToList();

        result.Translations.AddRange(otherUsersTranslations
            .Select(dbTranslation => new Translation
            {
                Id = dbTranslation.Id,
                UserTranslationId = default,
                Enabled = false,
                Position = position++,
                Value = dbTranslation.Value
            }));

        result.Translations = [..result.Translations.OrderBy(t => t.Position)];
    }

    private void SetRepresentationPictures(WordTranslationsRepresentation result, Word word)
    {
        result.Pictures.AddRange(word.Pictures.Where(t => t.UserPictures.Any(up => up.UserId == UserId))
            .Select(dbPicture =>
                new Picture
                {
                    Id = dbPicture.Id,
                    UserPictureId = dbPicture.UserPictures.First(up => up.UserId == UserId).Id,
                    Enabled = true,
                    Position = dbPicture.UserPictures.First(up => up.UserId == UserId).Position
                }));

        byte position = (byte)(result.Pictures.Count == 0 ? 0 : result.Pictures.Max(p => p.Position) + 1);

        var otherUserPictures = word.Pictures
            .Where(p => p.UserPictures.Count == 0 || p.UserPictures.All(up => up.UserId != UserId))
            .ToList();

        result.Pictures.AddRange(otherUserPictures
            .Select(dbPicture => new Picture
            {
                Id = dbPicture.Id,
                UserPictureId = default,
                Enabled = false,
                Position = position++
            }));

        result.Pictures = [..result.Pictures.OrderBy(p => p.Position)];
        result.IsAnyNewPictureAvailable = word.Pictures.Count > 0 &&
                                       word.Pictures.All(p => p.UserPictures.All(up => up.UserId != UserId));
    }

    private void SetRepresentationUsages(WordTranslationsRepresentation result, Word word)
    {
        result.Usages.AddRange(word.Usages.Where(u => u.UserUsages.Any(uu => uu.UserId == UserId))
            .Select(dbUsage =>
                new Representations.Usage
                {
                    Id = dbUsage.Id,
                    UserUsageId = dbUsage.UserUsages.First(uu => uu.UserId == UserId).Id,
                    Enabled = true,
                    Position = dbUsage.UserUsages.First(uu => uu.UserId == UserId).Position,
                    Value = dbUsage.Value
                }));

        byte position = (byte)(result.Usages.Count == 0 ? 0 : result.Usages.Max(u => u.Position) + 1);

        var otherUsersUsages = word.Usages
            .Where(u => u.UserUsages.Count == 0 || u.UserUsages.All(uu => uu.UserId != UserId))
            .ToList();

        result.Usages.AddRange(otherUsersUsages
            .Select(dbUsage => new Representations.Usage
            {
                Id = dbUsage.Id,
                UserUsageId = default,
                Enabled = false,
                Position = position++,
                Value = dbUsage.Value
            }));

        result.Usages = [..result.Usages.OrderBy(t => t.Position)];
    }

    private static async Task AddPronunciationAsync(Word word, Language language)
    {
        try
        {
            var url = "https://api.soundoftext.com/sounds";
            string voice = language == Language.English ? "en-GB" : "pl-PL";
            string json = $$"""
                            {
                                "engine": "Google",
                                "data": {"text": "{{word.Value}}", "voice": "{{voice}}"}
                            }
                            """;

            using var httpClient = new HttpClient();
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await httpClient.PostAsync(url, content);
            var jsonResponse = await response.Content.ReadAsStringAsync();
            var representation = JsonConvert.DeserializeObject<SoundOfTextRepresentation>(jsonResponse);
            if (representation.Success)
            {
                var downloadUrl = $"https://files.soundoftext.com/{representation.Id}.mp3";
                response = await httpClient.GetAsync(downloadUrl);
                var byteArray = await response.Content.ReadAsByteArrayAsync();
                word.PronunciationData = byteArray;
                word.PronunciationLength = byteArray.Length;
                word.PronunciationContentType = "audio/mpeg";
                word.PronunciationExtension = "mp3";
            }
        }
        catch (Exception e)
        {
            Console.WriteLine(e);
        }
    }
}