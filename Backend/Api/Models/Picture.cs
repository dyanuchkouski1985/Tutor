namespace Api.Models;

public class Picture
{
    public int Id { get; init; }
    public int WordId { get; init; }
    public Word Word { get; init; }
    public byte[] Data { get; init; }
    public string ContentType { get; init; }
    public string Extension { get; init; }
    public long Length { get; init; }
    public List<UserPicture> UserPictures { get; init; } = [];
}