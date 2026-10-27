using Api.Enums;
using Api.Interfaces.Services;
using Api.Requests.Listening;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ListeningController(IListeningService listeningService) : ControllerBase
{
    [HttpGet("[action]")]
    public async Task<IActionResult> Exercise(Language language, TranslationLanguage translationLanguage)
    {
        return Ok(await listeningService.GetExerciseAsync(language, translationLanguage));
    }

    [HttpPost("[action]")]
    public async Task<IActionResult> Answer(AnswerListeningRequest request)
    {
        return Ok(await listeningService.AnswerAsync(request));
    }
}
