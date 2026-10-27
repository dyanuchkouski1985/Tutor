using Api.Enums;
using Api.Interfaces.Services;
using Api.Requests.VerbForms;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class VerbFormsController(IVerbFormsService verbFormsService) : ControllerBase
{
    [HttpGet("[action]")]
    public async Task<IActionResult> Exercise(Language language)
    {
        return Ok(await verbFormsService.GetExerciseAsync(language));
    }

    [HttpPost("[action]")]
    public async Task<IActionResult> Answer(AnswerVerbFormsRequest request)
    {
        return Ok(await verbFormsService.AnswerAsync(request));
    }
}
