using Api.Constants;
using Api.Interfaces;
using Api.Interfaces.Services;
using Api.Models;
using Api.Requests.ExerciseWords;
using Api.Enums;
using Api.Representations;
using Microsoft.EntityFrameworkCore;

namespace Api.Services.BusinessLogic;

public class CrosswordExerciseService(TutorContext dbContext, ISecurityContext securityContext)
    : ICrosswordExerciseService
{
    private TutorContext dbContext { get; } = dbContext;
    private Guid userId { get; } = Guid.Parse(securityContext.GetCurrentUserId());

    public async Task<CrosswordExerciseRepresentation> GetAsync(GetCrosswordExerciseRequest request)
    {
        CrosswordExerciseRepresentation result = new();
        for (var i = 0; i < GeneralConstants.CrosswordBoardSize; i++)
            result.Board[i] = new BoardCell[GeneralConstants.CrosswordBoardSize];

        var words = await dbContext.Words
            .Include(w => w.UserWordLearningProgresses.Where(uwlp => uwlp.UserId == userId))
            .Where(w =>
                w.Language == request.Language && !EF.Functions.Like(w.Value, "% %") &&
                w.Translations.Any(t => t.UserTranslations.Any(ut => ut.UserId == userId)) &&
                w.UserWordLearningProgresses.Any(uwlp =>
                    uwlp.UserId == userId && uwlp.LastLearningDate < DateTime.Now.Date &&
                    (uwlp.WordLearningProgress == WordLearningProgress.None || uwlp.WordLearningProgress == WordLearningProgress.One
                    || uwlp.WordLearningProgress == WordLearningProgress.Two || uwlp.WordLearningProgress == WordLearningProgress.Three)))
            .ToListAsync();

        PutFirstHorizontalWordToTheBoard(result, words);

        while (true)
        {
            var previousHorizontalWords = result.HorizontalWords.Count;
            var previousVerticalWords = result.VerticalWords.Count;

            if (result.VerticalWords.Count < 6)
            {
                words = GetOrderedWords(words, result);
                PutNextVerticalWordToTheBoard(result, words);
            }

            if (result.HorizontalWords.Count < 6)
            {
                words = GetOrderedWords(words, result);
                PutNextHorizontalWordToTheBoard(result, words);
            }

            if (result.VerticalWords.Count == 6 && result.HorizontalWords.Count == 6)
                break;
            if (result.VerticalWords.Count == previousVerticalWords &&
                result.HorizontalWords.Count == previousHorizontalWords)
                break;
        }

        var resultWords = result.VerticalWords.Concat(result.HorizontalWords).ToList();
        var wordIds = resultWords.Select(w => w.WordId).ToList();

        var translations = await dbContext.Translations.Include(t => t.UserTranslations)
            .Where(t => wordIds.Contains(t.WordId) && t.UserTranslations.Any(ut => ut.UserId == userId)).ToListAsync();

        var pictures = await dbContext.Pictures.Include(p => p.UserPictures)
            .Where(p => wordIds.Contains(p.WordId) && p.UserPictures.Any(up => up.UserId == userId)).ToListAsync();

        var usages = await dbContext.Usages.Include(u => u.UserUsages)
            .Where(u => wordIds.Contains(u.WordId) && u.UserUsages.Any(uu => uu.UserId == userId)).ToListAsync();

        foreach (var resultWord in resultWords)
        {
            var wordTranslations = translations.Where(t => t.WordId == resultWord.WordId)
                .OrderBy(t => t.UserTranslations.First().Position).ToList();
            resultWord.Translations.AddRange(wordTranslations.Select(t => t.Value));

            var wordPictures = pictures.Where(p => p.WordId == resultWord.WordId)
                .OrderBy(p => p.UserPictures.First().Position).ToList();
            resultWord.PictureIds.AddRange(wordPictures.Select(p => p.Id));

            var wordUsages = usages.Where(u => u.WordId == resultWord.WordId)
                .OrderBy(t => t.UserUsages.First().Position).ToList();
            resultWord.Usages.AddRange(wordUsages.Select(u => u.Value));

            resultWord.IsAnyNewPictureAvailable =
                pictures.Any() && pictures.All(p => p.UserPictures.All(up => up.UserId != userId));
        }

        result.VerticalWords = result.VerticalWords.OrderBy(w => w.StartX).ThenBy(w => w.StartY).ToList();
        result.HorizontalWords = result.HorizontalWords.OrderBy(w => w.StartY).ThenBy(w => w.StartX).ToList();

        return result;
    }

    private void PutFirstHorizontalWordToTheBoard(CrosswordExerciseRepresentation result, List<Word> words)
    {
        var word = words.OrderByDescending(w => w.Value.Length).Take(20).MinBy(_ => Guid.NewGuid());

        words.Remove(word);
        Random r = new();

        var startX = r.Next(0, GeneralConstants.CrosswordBoardSize - 1 - word.Value.Length);
        var startY = r.Next(0, GeneralConstants.CrosswordBoardSize / 2 - 1);

        for (int i = 0; i < word.Value.Length; i++)
        {
            result.Board[startY][startX + i] = new BoardCell
            {
                Direction = Direction.Horizontal,
                Value = word.Value[i].ToString(),
                HorizontalWordId = word.Id
            };
        }

        result.HorizontalWords.Add(new CrosswordRepresentation
        {
            StartY = startY,
            StartX = startX,
            WordId = word.Id,
            Value = word.Value,
            WordLearningProgress =
                word.UserWordLearningProgresses.FirstOrDefault(uwlp => uwlp.UserId == userId)?.WordLearningProgress ??
                WordLearningProgress.None
        });
    }

    private void PutNextVerticalWordToTheBoard(CrosswordExerciseRepresentation result, List<Word> words)
    {
        Dictionary<int, List<(int startY, int startX, Word word)>> positions = new();

        foreach (var word in words)
        {
            for (int startY = 0; startY <= GeneralConstants.CrosswordBoardSize - word.Value.Length; startY++)
                for (int startX = 0; startX < GeneralConstants.CrosswordBoardSize; startX++)
                {
                    if (positions.Any())
                        break;

                    var canWordBeUsed = false;
                    var crossedWordsCount = 0;
                    for (int y = 0; y < word.Value.Length; y++)
                    {
                        canWordBeUsed = false;

                        if (startY + y > 0 &&
                            (result.Board[startY + y - 1][startX]?.Direction is Direction.Vertical or Direction.Both ||
                             y == 0 && result.Board[startY + y - 1][startX]?.Direction == Direction.Horizontal))
                            break;

                        if (startY + y < GeneralConstants.CrosswordBoardSize - 1 &&
                            (result.Board[startY + y + 1][startX]?.Direction is Direction.Vertical or Direction.Both ||
                             y == word.Value.Length - 1 &&
                             result.Board[startY + y + 1][startX]?.Direction == Direction.Horizontal))
                            break;

                        if (startX > 0)
                        {
                            if (result.Board[startY + y][startX - 1]?.Direction is Direction.Vertical or Direction.Both)
                                break;

                            if (startX > 1 && result.Board[startY + y][startX] == null &&
                                result.Board[startY + y][startX - 1]?.Direction is Direction.Horizontal or Direction.Both &&
                                result.Board[startY + y][startX - 2]?.Direction is Direction.Horizontal or Direction.Both)
                                break;
                        }

                        if (startX < GeneralConstants.CrosswordBoardSize - 1)
                        {
                            if (result.Board[startY + y][startX + 1]?.Direction is Direction.Vertical or Direction.Both)
                                break;

                            if (startX < GeneralConstants.CrosswordBoardSize - 2 && result.Board[startY + y][startX] == null &&
                                result.Board[startY + y][startX + 1]?.Direction is Direction.Horizontal or Direction.Both &&
                                result.Board[startY + y][startX + 2]?.Direction is Direction.Horizontal or Direction.Both)
                                break;
                        }

                        var cell = result.Board[startY + y][startX];
                        if (cell == null)
                        {
                            canWordBeUsed = true;
                            continue;
                        }

                        if (cell.Direction is Direction.Vertical or Direction.Both)
                            break;

                        if (cell.Value == word.Value[y].ToString())
                            crossedWordsCount++;
                        else
                            break;

                        canWordBeUsed = true;
                    }

                    if (canWordBeUsed && crossedWordsCount > 0)
                    {
                        if (!positions.ContainsKey(crossedWordsCount))
                            positions[crossedWordsCount] = new List<(int, int, Word)>();

                        positions[crossedWordsCount].Add((startY, startX, word));
                    }
                }
        }

        if (positions.Any())
        {
            var (startY, startX, word) = positions[positions.Keys.Min()].MinBy(_ => Guid.NewGuid());
            words.Remove(word);

            for (int y = 0; y < word.Value.Length; y++)
            {
                var cell = result.Board[startY + y][startX];
                if (cell == null)
                    result.Board[startY + y][startX] = new BoardCell
                    {
                        Direction = Direction.Vertical,
                        Value = word.Value[y].ToString(),
                        VerticalWordId = word.Id
                    };
                else
                {
                    cell.Direction = Direction.Both;
                    cell.VerticalWordId = word.Id;
                }
            }

            result.VerticalWords.Add(new CrosswordRepresentation
            {
                StartY = startY,
                StartX = startX,
                WordId = word.Id,
                Value = word.Value,
                WordLearningProgress =
                    word.UserWordLearningProgresses.FirstOrDefault(uwlp => uwlp.UserId == userId)?.WordLearningProgress ??
                    WordLearningProgress.None
            });
        }
    }

    private void PutNextHorizontalWordToTheBoard(CrosswordExerciseRepresentation result, List<Word> words)
    {
        Dictionary<int, List<(int startY, int startX, Word word)>> positions = new();

        foreach (var word in words)
        {
            for (int startY = 0; startY < GeneralConstants.CrosswordBoardSize; startY++)
                for (int startX = 0; startX <= GeneralConstants.CrosswordBoardSize - word.Value.Length; startX++)
                {
                    if (positions.Any())
                        break;

                    var canWordBeUsed = false;
                    var crossedWordsCount = 0;
                    for (int x = 0; x < word.Value.Length; x++)
                    {
                        canWordBeUsed = false;
                        if (startY > 0)
                        {
                            if (result.Board[startY - 1][startX + x]?.Direction is Direction.Horizontal or Direction.Both)
                                break;

                            if (startY > 1 && result.Board[startY][startX + x] == null &&
                                result.Board[startY - 1][startX + x]?.Direction is Direction.Vertical or Direction.Both &&
                                result.Board[startY - 2][startX + x]?.Direction is Direction.Vertical or Direction.Both)
                                break;
                        }

                        if (startY < GeneralConstants.CrosswordBoardSize - 1)
                        {
                            if (result.Board[startY + 1][startX + x]?.Direction is Direction.Horizontal or Direction.Both)
                                break;

                            if (startY < GeneralConstants.CrosswordBoardSize - 2 && result.Board[startY][startX + x] == null &&
                                result.Board[startY + 1][startX + x]?.Direction is Direction.Vertical or Direction.Both &&
                                result.Board[startY + 2][startX + x]?.Direction is Direction.Vertical or Direction.Both)
                                break;
                        }

                        if (startX + x > 0 &&
                            (result.Board[startY][startX + x - 1]?.Direction is Direction.Horizontal or Direction.Both ||
                             x == 0 && result.Board[startY][startX + x - 1]?.Direction == Direction.Vertical))
                            break;

                        if (startX + x < GeneralConstants.CrosswordBoardSize - 1 &&
                            (result.Board[startY][startX + x + 1]?.Direction is Direction.Horizontal or Direction.Both ||
                             x == word.Value.Length - 1 &&
                             result.Board[startY][startX + x + 1]?.Direction == Direction.Vertical))
                            break;

                        var cell = result.Board[startY][startX + x];
                        if (cell == null)
                        {
                            canWordBeUsed = true;
                            continue;
                        }

                        if (cell.Direction is Direction.Horizontal or Direction.Both)
                            break;

                        if (cell.Value == word.Value[x].ToString())
                            crossedWordsCount++;
                        else
                            break;

                        canWordBeUsed = true;
                    }

                    if (canWordBeUsed && crossedWordsCount > 0)
                    {
                        if (!positions.ContainsKey(crossedWordsCount))
                            positions[crossedWordsCount] = new List<(int, int, Word)>();

                        positions[crossedWordsCount].Add((startY, startX, word));
                    }
                }
        }

        if (positions.Any())
        {
            var (startY, startX, word) = positions[positions.Keys.Min()].MinBy(_ => Guid.NewGuid());
            words.Remove(word);

            for (int x = 0; x < word.Value.Length; x++)
            {
                var cell = result.Board[startY][startX + x];
                if (cell == null)
                    result.Board[startY][startX + x] = new BoardCell
                    {
                        Direction = Direction.Horizontal,
                        Value = word.Value[x].ToString(),
                        HorizontalWordId = word.Id
                    };
                else
                {
                    cell.Direction = Direction.Both;
                    cell.HorizontalWordId = word.Id;
                }
            }

            result.HorizontalWords.Add(new CrosswordRepresentation
            {
                StartY = startY,
                StartX = startX,
                WordId = word.Id,
                Value = word.Value,
                WordLearningProgress =
                    word.UserWordLearningProgresses.FirstOrDefault(uwlp => uwlp.UserId == userId)?.WordLearningProgress ??
                    WordLearningProgress.None
            });
        }
    }

    private static List<Word> GetOrderedWords(List<Word> words, CrosswordExerciseRepresentation result)
    {
        var resultWords = result.VerticalWords.Concat(result.HorizontalWords).ToList();
        var zeroProgressWordsCount = resultWords.Count(w => w.WordLearningProgress == WordLearningProgress.None);

        var zeroProgressWords = words.Where(w =>
                (w.UserWordLearningProgresses.FirstOrDefault()?.WordLearningProgress ??
                 WordLearningProgress.None) == WordLearningProgress.None)
            .OrderByDescending(w => w.UserWordLearningProgresses.FirstOrDefault()?.LastLearningDate).ToList();

        var otherProgressWords = words.Where(w => zeroProgressWords.All(zpw => zpw.Id != w.Id))
            .OrderBy(w => w.UserWordLearningProgresses.First().WordLearningProgress)
            .ThenBy(w => w.UserWordLearningProgresses.First().LastLearningDate).ToList();

        return zeroProgressWordsCount < 3
            ? zeroProgressWords.Concat(otherProgressWords).ToList()
            : otherProgressWords.Concat(zeroProgressWords).ToList();
    }
}
