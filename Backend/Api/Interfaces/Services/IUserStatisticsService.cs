using Api.Representations;
using Api.Requests.UserStatistics;

namespace Api.Interfaces.Services;

public interface IUserStatisticsService
{
    Task<UserStatisticsRepresentation> GetAsync(GetUserStatisticsRequest request);
    Task<UserStatisticsCalendarRepresentation> GetCalendarAsync(GetUserStatisticsCalendarRequest request);
}