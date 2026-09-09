using Api.Interfaces.Services;
using Api.Models;
using Microsoft.EntityFrameworkCore;
using Api.Representations;

namespace Api.Services.BusinessLogic;

public class WordPronunciationService(TutorContext dbContext)
    : IWordPronunciationService
{
    private TutorContext dbContext { get; } = dbContext;

    public async Task<WordPronunciationRepresentation> GetWordPronunciationAsync(int wordId)
    {
        return await dbContext.Words
            .AsNoTracking()
            .Where(w => w.Id == wordId)
            .Select(w => new WordPronunciationRepresentation(w.PronunciationData, w.PronunciationContentType))
            .FirstOrDefaultAsync();
    }
}