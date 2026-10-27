using Api.Enums;
using Api.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class TomorrowWordsController(ITomorrowWordsService tomorrowWordsService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(Language language)
    {
        return Ok(await tomorrowWordsService.GetAsync(language));
    }
}
