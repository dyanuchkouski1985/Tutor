using Api.Enums;
using Api.Interfaces.Services;
using Api.Requests.GapChoice;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ArticlesController(IArticlesService articlesService) : ControllerBase
{
    [HttpGet("[action]")]
    public async Task<IActionResult> Exercise(Language language)
    {
        return Ok(await articlesService.GetExerciseAsync(language));
    }

    [HttpPost("[action]")]
    public async Task<IActionResult> Answer(AnswerGapChoiceRequest request)
    {
        return Ok(await articlesService.AnswerAsync(request));
    }
}
