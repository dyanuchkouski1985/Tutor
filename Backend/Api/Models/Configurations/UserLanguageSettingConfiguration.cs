using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Api.Models.Configurations;

public class UserLanguageSettingConfiguration : IEntityTypeConfiguration<UserLanguageSetting>
{
    public void Configure(EntityTypeBuilder<UserLanguageSetting> builder)
    {
        builder.Property(entity => entity.UserId).IsRequired();
        builder.Property(entity => entity.Language).IsRequired();
        builder.Property(entity => entity.Level).IsRequired();

        builder.HasIndex(entity => new { entity.UserId, entity.Language }).IsUnique();
    }
}
