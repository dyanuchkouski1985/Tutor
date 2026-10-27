using Microsoft.IdentityModel.Tokens;
using Microsoft.IdentityModel.JsonWebTokens;

namespace Api.Auth;

public static class ServiceCollectionExtensions
{
    internal static void AddAuthServices(this IServiceCollection services, IConfiguration configuration)
    {
        JsonWebTokenHandler.DefaultInboundClaimTypeMap.Clear();
        services.AddAuthentication("Bearer")
            .AddJwtBearer("Bearer", options =>
            {
                options.IncludeErrorDetails = true;
                options.Authority = configuration["IdentityEndpoint"];
                options.RefreshInterval = TimeSpan.FromSeconds(10);

                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    ValidateIssuer = false,
                    ValidateAudience = true,
                    ValidAudience = "api"
                };
            });
    }
}