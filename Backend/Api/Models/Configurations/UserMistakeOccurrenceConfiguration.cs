using Api.Constants;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Api.Models.Configurations;

public class UserMistakeOccurrenceConfiguration : IEntityTypeConfiguration<UserMistakeOccurrence>
{
    public void Configure(EntityTypeBuilder<UserMistakeOccurrence> builder)
    {
        builder.Property(entity => entity.PatternId).IsRequired();
        builder.Property(entity => entity.MessageId).IsRequired(false);
        builder.Property(entity => entity.Fragment).IsRequired()
            .HasMaxLength(GeneralConstants.ConversationMessageMaxLength);
        builder.Property(entity => entity.Correction).IsRequired()
            .HasMaxLength(GeneralConstants.ConversationMessageMaxLength);
        builder.Property(entity => entity.Explanation).IsRequired(false)
            .HasMaxLength(GeneralConstants.MistakeExplanationMaxLength);
        builder.Property(entity => entity.CreatedDate).IsRequired();

        builder.HasOne(entity => entity.Pattern)
            .WithMany(entity => entity.Occurrences)
            .HasForeignKey(entity => entity.PatternId)
            .IsRequired()
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(entity => entity.Message)
            .WithMany()
            .HasForeignKey(entity => entity.MessageId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
