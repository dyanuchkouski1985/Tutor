namespace Api.Infrastructure;

public static class ApplicationBuilderExtensions
{
    public static void UseSecurityContext(this IApplicationBuilder builder)
    {
        builder.UseMiddleware<SecurityContextMiddleware>();
    }
}