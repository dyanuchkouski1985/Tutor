using Api.Enums;
using Api.Interfaces.Services;
using Api.Requests.LanguageSettings;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class LanguageSettingsController(ILanguageSettingsService languageSettingsService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(Language language)
    {
        return Ok(await languageSettingsService.GetAsync(language));
    }

    [HttpPut]
    public async Task<IActionResult> Put(Language language, PutLanguageSettingRequest request)
    {
        if (!Enum.IsDefined(request.Level))
            return BadRequest();

        return Ok(await languageSettingsService.PutAsync(language, request));
    }
}
