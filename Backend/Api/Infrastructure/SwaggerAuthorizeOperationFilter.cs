using Microsoft.OpenApi;
//using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace Api.Infrastructure;

public class SwaggerAuthorizeOperationFilter : IOperationFilter
{
    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        var requireSecurity =
            context.MethodInfo.CustomAttributes.Any(cad => cad.AttributeType.Name == "AuthorizeAttribute");
        if (!requireSecurity)
        {
            if (context.MethodInfo.CustomAttributes.Any(cad => cad.AttributeType.Name == "AllowAnonymousAttribute"))
                return;

            requireSecurity = context.MethodInfo.ReflectedType?.CustomAttributes.Any(cad =>
                cad.AttributeType.Name == "AuthorizeAttribute") == true;
        }

        if (requireSecurity)
        {
            operation.Security ??= new List<OpenApiSecurityRequirement>();

            operation.Security.Add(new OpenApiSecurityRequirement
            {
                {
                    new OpenApiSecuritySchemeReference("Bearer"),
                    ["api"]
                }
            });
        }
    }
}