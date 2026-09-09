using Api.Interfaces;
using Api.Interfaces.Services;
using Api.Models;
using Api.Services.BusinessLogic;
using Microsoft.EntityFrameworkCore;

namespace Api.Infrastructure;

public static class ServiceCollectionExtensions
{
    public static void AddDbContext(this IServiceCollection services, IConfiguration configuration,
        string connectionStringName)
    {
        var connectionString = configuration.GetConnectionString(connectionStringName) ??
                               throw new InvalidOperationException(
                                   $"Connection string '{connectionStringName}' not found.");

        services.AddDbContext<TutorContext>(options => options.UseSqlServer(connectionString));
    }

    public static void AddSecurityContext(this IServiceCollection services)
    {
        services.AddScoped<ISecurityContext, SecurityContextProvider>();
    }

    public static void AddBusinessServices(this IServiceCollection services)
    {
        services
            .AddScoped<IWordTranslationsService, WordTranslationsService>()
            .AddScoped<ITranslationsWordExerciseService, TranslationsWordExerciseService>()
            .AddScoped<ICrosswordExerciseService, CrosswordExerciseService>()
            .AddScoped<IRepeatPausedWordsExerciseService, RepeatPausedWordsExerciseService>()
            .AddScoped<IUserStatisticsService, UserStatisticsService>()
            .AddScoped<IPictureService, PictureService>()
            .AddScoped<IWordPronunciationService, WordPronunciationService>();
    }
}