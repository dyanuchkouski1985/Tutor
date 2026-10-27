using Api.Enums;

namespace Api.Requests.UserStatistics;

public class GetUserStatisticsCalendarRequest
{
    public Language Language { get; set; }
    public int Months { get; set; }
}
