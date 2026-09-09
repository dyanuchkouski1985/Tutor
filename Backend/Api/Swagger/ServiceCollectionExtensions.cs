using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.OpenApi;

namespace Api.Swagger;

public static class ServiceCollectionExtensions
{
    internal static void AddSwaggerServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddEndpointsApiExplorer();

        var identityEndpoint = configuration["IdentityEndpoint"];

        services.AddOpenApi(options =>
        {
            options.AddDocumentTransformer((document, context, cancellationToken) =>
            {
                document.Components ??= new OpenApiComponents();
                document.Components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>();

                document.Components.SecuritySchemes.Add("oauth2", new OpenApiSecurityScheme
                {
                    Type = SecuritySchemeType.OAuth2,
                    Flows = new OpenApiOAuthFlows
                    {
                        AuthorizationCode = new OpenApiOAuthFlow
                        {
                            AuthorizationUrl = new Uri($"{identityEndpoint}connect/authorize"),
                            TokenUrl = new Uri($"{identityEndpoint}connect/token"),
                            Scopes = new Dictionary<string, string>
                            {
                                { "api", "api" },
                                { "openid", "openid" },
                                { "email", "Access the user's email address" },
                                { "profile", "Access the user's profile" }
                            }
                        }
                    }
                });

                foreach (var group in context.DescriptionGroups)
                {
                    foreach (var item in group.Items)
                    {
                        if (item.ActionDescriptor is ControllerActionDescriptor cad)
                        {
                            var methodAttributes = cad.MethodInfo.GetCustomAttributes(inherit: true);
                            var controllerAttributes = cad.ControllerTypeInfo.GetCustomAttributes(inherit: true);

                            var hasAllowAnonymous =
                                methodAttributes.OfType<AllowAnonymousAttribute>().Any() ||
                                controllerAttributes.OfType<AllowAnonymousAttribute>().Any();

                            if (hasAllowAnonymous)
                            {
                                continue;
                            }

                            var path = "/" + item.RelativePath;
                            var httpMethod = item.HttpMethod?.ToUpperInvariant();
                            if (httpMethod == null)
                            {
                                continue;
                            }

                            if (!document.Paths.TryGetValue(path, out var pathItem))
                            {
                                continue;
                            }

                            var method = new HttpMethod(httpMethod);
                            if (pathItem.Operations?.TryGetValue(method, out var operation) != true)
                            {
                                continue;
                            }

                            operation.Security ??= new List<OpenApiSecurityRequirement>();
                            operation.Security.Add(new OpenApiSecurityRequirement
                            {
                                {
                                    new OpenApiSecuritySchemeReference("oauth2"),
                                    [ "api", "profile", "email", "openid" ]
                                }
                            });
                        }
                    }
                }

                document.SetReferenceHostDocument();

                return Task.CompletedTask;
            });
        });
    }
}