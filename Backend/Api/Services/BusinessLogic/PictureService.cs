using Api.Interfaces.Services;
using Api.Models;
using Api.Representations;
using Microsoft.EntityFrameworkCore;

namespace Api.Services.BusinessLogic;

public class PictureService(TutorContext dbContext)
    : IPictureService
{
    private TutorContext dbContext { get; init; } = dbContext;

    public async Task<PictureRepresentation> GetAsync(int id)
    {
        return await dbContext.Pictures.Where(p => p.Id == id).Select(p => new PictureRepresentation
        {
            Data = p.Data,
            ContentType = p.ContentType
        }).FirstOrDefaultAsync();
    }
}