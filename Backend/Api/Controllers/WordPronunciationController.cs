using Api.Interfaces.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class WordPronunciationController(
    IWordPronunciationService wordPronunciationService
    ) : ControllerBase
{
    [AllowAnonymous]
    [HttpGet("{wordId:int}")]
    public async Task<IActionResult> Pronunciation(int wordId)
    {
        var word = await wordPronunciationService.GetWordPronunciationAsync(wordId);
        return word == null ? NotFound() : File(word.Data, word.ContentType);
    }
}