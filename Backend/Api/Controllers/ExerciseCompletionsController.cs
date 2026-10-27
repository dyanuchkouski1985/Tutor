using Api.Constants;
using Api.Enums;
using Api.Interfaces.Services;
using Api.Requests.ExerciseCompletions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ExerciseCompletionsController(IExerciseCompletionsService exerciseCompletionsService) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Post(PostExerciseCompletionRequest request)
    {
        if (!Enum.IsDefined(request.Language) || !Enum.IsDefined(request.Exercise))
            return BadRequest();

        await exerciseCompletionsService.MarkCompletedAsync(request.Language, request.Exercise);

        return Ok();
    }

    [HttpGet("Summary")]
    public async Task<IActionResult> GetSummary(Language language,
        int months = GeneralConstants.CalendarDefaultMonths, bool isAllUsers = false)
    {
        return Ok(await exerciseCompletionsService.GetSummaryAsync(language, months, isAllUsers));
    }
}
