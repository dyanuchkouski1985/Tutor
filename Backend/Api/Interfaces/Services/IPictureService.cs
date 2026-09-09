using Api.Representations;

namespace Api.Interfaces.Services;

public interface IPictureService
{
    Task<PictureRepresentation> GetAsync(int id);
}