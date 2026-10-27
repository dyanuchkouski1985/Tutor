using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Api.Models.Configurations;

public class UserExerciseCompletionConfiguration : IEntityTypeConfiguration<UserExerciseCompletion>
{
    public void Configure(EntityTypeBuilder<UserExerciseCompletion> builder)
    {
        builder.Property(entity => entity.UserId).IsRequired();
        builder.Property(entity => entity.Language).IsRequired();
        builder.Property(entity => entity.Exercise).IsRequired();
        builder.Property(entity => entity.Date).IsRequired();

        builder.HasIndex(entity => new { entity.UserId, entity.Language, entity.Date, entity.Exercise }).IsUnique();
    }
}
