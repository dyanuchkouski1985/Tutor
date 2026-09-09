namespace Api.Models;

public class UserPicture
{
    public int Id { get; init; }
    public Guid UserId { get; init; }
    public int PictureId { get; init; }
    public Picture Picture { get; init; }
    public byte Position { get; set; }
}