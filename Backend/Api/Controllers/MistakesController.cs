using Api.Enums;
using Api.Interfaces.Services;
using Api.Requests.Mistakes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class MistakesController(IMistakesService mistakesService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(Language language)
    {
        return Ok(await mistakesService.GetAsync(language));
    }

    [HttpGet("[action]")]
    public async Task<IActionResult> AvailableCount(Language language)
    {
        return Ok(await mistakesService.GetAvailableCountAsync(language));
    }

    [HttpGet("[action]")]
    public async Task<IActionResult> Exercise(Language language)
    {
        return Ok(await mistakesService.GetExerciseAsync(language));
    }

    [HttpPost("{patternId:int}/[action]")]
    public async Task<IActionResult> Answer(int patternId, AnswerMistakeTaskRequest request)
    {
        var result = await mistakesService.AnswerAsync(patternId, request);

        return result == null ? NotFound() : Ok(result);
    }

    [HttpPut("{patternId:int}")]
    public async Task<IActionResult> Update(int patternId, UpdateMistakePatternRequest request)
    {
        var pattern = await mistakesService.UpdateAsync(patternId, request);

        return pattern == null ? NotFound() : Ok(pattern);
    }

    [HttpDelete("{patternId:int}")]
    public async Task<IActionResult> Delete(int patternId)
    {
        return Ok(await mistakesService.DeleteAsync(patternId));
    }
}
