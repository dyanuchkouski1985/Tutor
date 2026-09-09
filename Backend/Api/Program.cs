using Api.Auth;
using Api.Cors;
using Api.Infrastructure;
using Api.Swagger;

var builder = WebApplication.CreateBuilder(args);
var services = builder.Services;

services.AddBusinessServices();
services.AddSecurityContext();
services.AddDbContext(builder.Configuration, "TutorConnection");
services.AddControllers();

services.AddAuthServices(builder.Configuration);
services.AddSwaggerServices(builder.Configuration);
services.AddCorsServices(builder.Configuration);

var app = builder.Build();

app.UseCors();
app.MapOpenApi();

app.UseSwaggerMiddlewareAndUI();

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.UseSecurityContext();

app.MapControllers();

app.Run();
