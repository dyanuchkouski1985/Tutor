using Api.Constants;
using Api.Enums;
using Api.Interfaces;
using Api.Interfaces.Services;
using Api.Models;
using Api.Representations;
using Microsoft.EntityFrameworkCore;

namespace Api.Services.BusinessLogic;

public class TomorrowWordsService(
    TutorContext dbContext,
    ISecurityContext securityContext,
    ITranslationsWordExerciseService translationsWordExerciseService) : ITomorrowWordsService
{
    private TutorContext dbContext { get; } = dbContext;
    private Guid userId { get; } = Guid.Parse(securityContext.GetCurrentUserId());
    private ITranslationsWordExerciseService translationsWordExerciseService { get; } = translationsWordExerciseService;

    public Task<List<TranslationsWordRepresentation>> GetAsync(Language language)
    {
        return translationsWordExerciseService.GetTomorrowAsync(language, GeneralConstants.TomorrowWordsCount);
    }

    public Task<int> CountAvailableWordsAsync(Language language)
    {
        return dbContext.Words.CountAsync(w =>
            w.Language == language
            && w.Translations.Any(t => t.UserTranslations.Any(ut => ut.UserId == userId))
            && w.UserWordLearningProgresses.Any(uwlp =>
                uwlp.UserId == userId
                && uwlp.WordLearningProgress >= WordLearningProgress.None
                && uwlp.WordLearningProgress <= WordLearningProgress.Two));
    }
}
