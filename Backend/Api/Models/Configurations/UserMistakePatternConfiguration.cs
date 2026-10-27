using Api.Constants;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Api.Models.Configurations;

public class UserMistakePatternConfiguration : IEntityTypeConfiguration<UserMistakePattern>
{
    public void Configure(EntityTypeBuilder<UserMistakePattern> builder)
    {
        builder.Property(entity => entity.UserId).IsRequired();
        builder.Property(entity => entity.Language).IsRequired();
        builder.Property(entity => entity.Category).IsRequired()
            .HasMaxLength(GeneralConstants.MistakeCategoryMaxLength);
        builder.Property(entity => entity.Rule).IsRequired()
            .HasMaxLength(GeneralConstants.MistakeRuleMaxLength);
        builder.Property(entity => entity.Progress).IsRequired();
        builder.Property(entity => entity.CreatedDate).IsRequired();
        builder.Property(entity => entity.LastPracticeDate).IsRequired(false);

        builder.HasIndex(entity => new { entity.UserId, entity.Language, entity.Rule }).IsUnique();
    }
}
