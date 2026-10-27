using Api.Enums;
using Api.Interfaces.Services;
using Api.Requests.SentenceTranslation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class SentenceTranslationController(ISentenceTranslationService sentenceTranslationService)
    : ControllerBase
{
    [HttpGet("[action]")]
    public async Task<IActionResult> Exercise(Language language, TranslationLanguage translationLanguage,
        int? count)
    {
        return Ok(await sentenceTranslationService.GetExerciseAsync(language, translationLanguage, count));
    }

    [HttpPost("[action]")]
    public async Task<IActionResult> Answer(AnswerSentenceTranslationRequest request)
    {
        return Ok(await sentenceTranslationService.AnswerAsync(request));
    }
}
