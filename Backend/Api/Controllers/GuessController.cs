using Api.Enums;
using Api.Interfaces.Services;
using Api.Requests.Guess;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class GuessController(IGuessService guessService) : ControllerBase
{
    [HttpGet("[action]")]
    public async Task<IActionResult> Exercise(Language language)
    {
        return Ok(await guessService.GetExerciseAsync(language));
    }

    [HttpPost("[action]")]
    public async Task<IActionResult> Answer(AnswerGuessRequest request)
    {
        return Ok(await guessService.AnswerAsync(request));
    }
}
