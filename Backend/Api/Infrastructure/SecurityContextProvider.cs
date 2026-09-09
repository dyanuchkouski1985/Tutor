using Api.Interfaces;
using System.Security.Claims;

namespace Api.Infrastructure;

internal class SecurityContextProvider : ISecurityContext, ISecurityContextAcceptor
{
    public ClaimsPrincipal Principal { get; set; }

    public string GetCurrentUserId()
    {
        return FindFirstValue(ClaimTypes.Subject);
    }

    public string GetCurrentUserEmail()
    {
        return FindFirstValue(ClaimTypes.Email);
    }

    private string FindFirstValue(string claimType)
    {
        if (Principal == null)
            throw new Exception("Principal has not been initialized.");

        var claim = Principal.FindFirst(claimType) ?? throw new Exception($"Claim '{claimType}' was not found.");

        return claim.Value;
    }
}