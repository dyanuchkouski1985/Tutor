using Microsoft.EntityFrameworkCore;

namespace Identity.Data;

public static class ServiceCollectionExtensions
{
    internal static void AddDbServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<ApplicationDbContext>(options =>
        {
            options.UseSqlServer(configuration.GetConnectionString("DefaultConnection"));
            options.UseOpenIddict();
        });
        services.AddDatabaseDeveloperPageExceptionFilter();
    }
}