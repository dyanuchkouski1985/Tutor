namespace Api.Interfaces;

public interface ISecurityContext
{
    string GetCurrentUserId();
    string GetCurrentUserEmail();
}