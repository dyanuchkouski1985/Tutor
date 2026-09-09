using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Api.Models.Configurations;

public class UserWordLearningProgressConfiguration : IEntityTypeConfiguration<UserWordLearningProgress>
{
    public void Configure(EntityTypeBuilder<UserWordLearningProgress> builder)
    {
        builder.Property(entity => entity.UserId).IsRequired();
        builder.Property(entity => entity.WordId).IsRequired();
        builder.Property(entity => entity.WordLearningProgress).IsRequired();
        builder.Property(entity => entity.AddingDate).IsRequired();
        builder.Property(entity => entity.LastLearningDate).IsRequired();
    }
}