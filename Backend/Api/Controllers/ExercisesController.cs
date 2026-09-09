using Api.Enums;
using Api.Interfaces.Services;
using Api.Requests.ExerciseWords;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ExercisesController(
    ITranslationsWordExerciseService wordExerciseService,
    ICrosswordExerciseService crosswordExerciseService,
    IRepeatPausedWordsExerciseService pausedWordsExerciseService)
    : ControllerBase
{
    [HttpGet]
    [Route("[action]")]
    public async Task<IActionResult> TranslationsWord(Language language)
    {
        GetExerciseWordsRequest request = new()
        {
            Language = language
        };
        return Ok(await wordExerciseService.GetAsync(request));
    }

    [HttpGet]
    [Route("[action]")]
    public async Task<IActionResult> RepeatPausedWords(Language language)
    {
        GetExerciseWordsRequest request = new()
        {
            Language = language
        };
        return Ok(await pausedWordsExerciseService.GetAsync(request));
    }

    [HttpPut]
    public async Task<IActionResult> Put(List<PutExerciseWordResult> exerciseResults)
    {
        await wordExerciseService.PutAsync(exerciseResults);
        return Ok();
    }

    [HttpPut]
    [Route("[action]")]
    public async Task<IActionResult> RepeatPausedWords(List<PutExerciseWordResult> exerciseResults)
    {
        await pausedWordsExerciseService.PutAsync(exerciseResults);
        return Ok();
    }

    [HttpGet]
    [Route("[action]")]
    public async Task<IActionResult> Crossword(Language language)
    {
        GetCrosswordExerciseRequest request = new()
        {
            Language = language
        };
        return Ok(await crosswordExerciseService.GetAsync(request));
    }
}