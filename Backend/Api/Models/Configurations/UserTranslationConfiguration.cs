using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Api.Models.Configurations;

public class UserTranslationConfiguration : IEntityTypeConfiguration<UserTranslation>
{
    public void Configure(EntityTypeBuilder<UserTranslation> builder)
    {
        builder.Property(entity => entity.UserId).IsRequired();
        builder.Property(entity => entity.TranslationId).IsRequired();
        builder.Property(entity => entity.Position).IsRequired();

        builder.HasOne(entity => entity.Translation)
            .WithMany(entity => entity.UserTranslations)
            .HasForeignKey(entity => entity.TranslationId)
            .IsRequired()
            .OnDelete(DeleteBehavior.Restrict);
    }
}