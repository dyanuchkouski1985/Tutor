using System.Security.Claims;

namespace Api.Interfaces;

public interface ISecurityContextAcceptor
{
    ClaimsPrincipal Principal { set; }
}