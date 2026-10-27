using Api.Constants;
using Api.Enums;
using Api.Interfaces.Services;
using Api.Requests.UserStatistics;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class UserStatisticsController(IUserStatisticsService statisticsService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(Language language)
    {
        GetUserStatisticsRequest request = new()
        {
            Language = language
        };
        return Ok(await statisticsService.GetAsync(request));
    }

    [HttpGet("Calendar")]
    public async Task<IActionResult> GetCalendar(Language language,
        int months = GeneralConstants.CalendarDefaultMonths)
    {
        GetUserStatisticsCalendarRequest request = new()
        {
            Language = language,
            Months = months
        };
        return Ok(await statisticsService.GetCalendarAsync(request));
    }
}