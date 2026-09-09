using Api.Interfaces;

namespace Api.Infrastructure;

public class SecurityContextMiddleware
{
    private readonly RequestDelegate next;

    public SecurityContextMiddleware(RequestDelegate next)
    {
        this.next = next;
    }

    public Task Invoke(HttpContext context, ISecurityContext securityContext)
    {
        if (securityContext is SecurityContextProvider acceptor)
        {
            acceptor.Principal = context.User;
        }

        return next(context);
    }
}