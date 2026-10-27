using Identity.Enums;
using Microsoft.AspNetCore.Identity;

namespace Identity.Data;

public class ApplicationUser : IdentityUser
{
    public Gender Gender { get; set; }
}
