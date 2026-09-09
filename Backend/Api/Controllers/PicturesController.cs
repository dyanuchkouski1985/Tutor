using Api.Interfaces.Services;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

// TODO: Think about protecting this controller.
[ApiController]
[Route("api/[controller]")]
public class PicturesController(IPictureService pictureService) : ControllerBase
{
    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id)
    {
        var picture = await pictureService.GetAsync(id);
        return picture == null ? NotFound() : File(picture.Data, picture.ContentType);
    }
}