using Api.Enums;
using Api.Interfaces.Services;
using Api.Requests.Explain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ExplainController(IExplainService explainService) : ControllerBase
{
    [HttpGet("[action]")]
    public async Task<IActionResult> Exercise(Language language)
    {
        return Ok(await explainService.GetExerciseAsync(language));
    }

    [HttpPost("[action]")]
    public async Task<IActionResult> Guess(GuessExplainRequest request)
    {
        return Ok(await explainService.GuessAsync(request));
    }
}
