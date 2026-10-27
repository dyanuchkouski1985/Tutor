using Api.Constants;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Api.Models.Configurations;

public class ConversationMessageConfiguration : IEntityTypeConfiguration<ConversationMessage>
{
    public void Configure(EntityTypeBuilder<ConversationMessage> builder)
    {
        builder.Property(entity => entity.ConversationId).IsRequired();
        builder.Property(entity => entity.ParticipantId).IsRequired();
        builder.Property(entity => entity.Text).IsRequired()
            .HasMaxLength(GeneralConstants.ConversationMessageMaxLength);
        builder.Property(entity => entity.CreatedDate).IsRequired();
        builder.Property(entity => entity.ValidationStatus).IsRequired();
        builder.Property(entity => entity.ValidationSummary).IsRequired(false)
            .HasMaxLength(GeneralConstants.ConversationValidationSummaryMaxLength);
        builder.Property(entity => entity.ValidationErrorsJson).IsRequired(false);
        builder.Property(entity => entity.Points).IsRequired();

        builder.HasOne(entity => entity.Conversation)
            .WithMany(entity => entity.Messages)
            .HasForeignKey(entity => entity.ConversationId)
            .IsRequired()
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(entity => entity.Participant)
            .WithMany(entity => entity.Messages)
            .HasForeignKey(entity => entity.ParticipantId)
            .IsRequired()
            .OnDelete(DeleteBehavior.Restrict);
    }
}
