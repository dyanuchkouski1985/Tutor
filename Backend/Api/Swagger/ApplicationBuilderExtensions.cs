namespace Api.Swagger;

internal static class ApplicationBuilderExtensions
{
    public static void UseSwaggerMiddlewareAndUI(this IApplicationBuilder app)
    {
        app.UseSwaggerUI(options =>
        {
            options.SwaggerEndpoint("/openapi/v1.json", "v1");
            options.OAuthClientId("swagger-ui");
            options.OAuthUsePkce();
            options.OAuthScopes("api", "profile", "email", "openid");
        });
    }
}