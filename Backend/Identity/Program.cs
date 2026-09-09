using Identity.Services;
using Identity.Data;
using Identity.Identity;

var builder = WebApplication.CreateBuilder(args);
var services = builder.Services;

services.AddDbServices(builder.Configuration);
services.AddIdentityServices();

services.AddControllersWithViews();
services.AddRazorPages();

services.ConfigureApplicationCookieServices(builder.Environment);

services.AddAuthenticationServices();

services.AddAuthorization();

services.AddOpenIddictServices();

if (builder.Environment.IsDevelopment())
    services.AddAntiforgery(o => o.SuppressXFrameOptionsHeader = true);

services.AddCors(options => options.AddPolicy("AllowAny", p => p.AllowAnyOrigin().AllowAnyMethod()
    .AllowAnyHeader()));

services.AddHostedService<ClientsConfigHostedService>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
    app.UseDeveloperExceptionPage();

app.UseStaticFiles();

app.UseRouting();

app.UseCors("AllowAny");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");
app.MapRazorPages();

app.Run();