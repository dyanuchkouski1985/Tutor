using Api.Interfaces.Services;
using Api.Requests.Speech;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class SpeechController(ISpeechService speechService) : ControllerBase
{
    [HttpGet("[action]")]
    public async Task<IActionResult> Token()
    {
        return Ok(await speechService.GetTokenAsync());
    }

    [HttpPost("[action]")]
    public async Task<IActionResult> Speak(SpeakRequest request)
    {
        var result = await speechService.SpeakAsync(request);

        if (result.Error != null)
            return Problem(result.Error, statusCode: StatusCodes.Status503ServiceUnavailable);

        HttpContext.Response.RegisterForDispose(result.Source);

        return File(result.Audio, result.ContentType);
    }
}
