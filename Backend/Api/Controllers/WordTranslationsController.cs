using Api.Enums;
using Api.Interfaces.Services;
using Api.Requests.WordTranslations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;

namespace Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class WordTranslationsController(
    IWordTranslationsService translationService
    ) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Search(SearchWordTranslationsRequest request)
    {
        return Ok(await translationService.SearchAsync(request));
    }

    [HttpGet("[action]")]
    public async Task<IActionResult> Suggestions(Language language)
    {
        return Ok(await translationService.SuggestionsAsync(language));
    }

    [HttpPost("[action]")]
    public async Task<IActionResult> SuggestTranslations(SuggestWordItemsRequest request)
    {
        return Ok(await translationService.SuggestTranslationsAsync(request));
    }

    [HttpPost("[action]")]
    public async Task<IActionResult> SuggestUsages(SuggestWordItemsRequest request)
    {
        return Ok(await translationService.SuggestUsagesAsync(request));
    }

    [HttpGet]
    public async Task<IActionResult> Get(string value, Language language)
    {
        GetWordTranslationsRequest request = new()
        {
            Value = value,
            Language = language
        };
        return Ok(await translationService.GetAsync(request));
    }

    [HttpPut]
    public async Task<IActionResult> Put(IFormFileCollection files, IFormFile pronunciation)
    {
        var request = JsonConvert.DeserializeObject<PutWordTranslationsRequest>(Request.Form["request"]);
        return Ok(await translationService.PutAsync(request, files, pronunciation));
    }

    [HttpDelete]
    public async Task<IActionResult> Delete(int wordId)
    {
        return Ok(await translationService.DeleteAsync(wordId));
    }

    [HttpPost("[action]")]
    public async Task<IActionResult> AddPronunciations(Language language)
    {
        await translationService.AddPronunciationsAsync(language);
        return Ok();
    }
}