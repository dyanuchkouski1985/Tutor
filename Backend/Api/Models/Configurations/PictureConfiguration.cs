using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Api.Models.Configurations;

public class PictureConfiguration : IEntityTypeConfiguration<Picture>
{
    public void Configure(EntityTypeBuilder<Picture> builder)
    {
        builder.Property(entity => entity.Data).IsRequired();
        builder.Property(entity => entity.ContentType).IsRequired();
        builder.Property(entity => entity.Extension).IsRequired();
    }
}