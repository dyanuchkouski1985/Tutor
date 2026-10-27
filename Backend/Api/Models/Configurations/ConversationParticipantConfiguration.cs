using Api.Constants;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Api.Models.Configurations;

public class ConversationParticipantConfiguration : IEntityTypeConfiguration<ConversationParticipant>
{
    public void Configure(EntityTypeBuilder<ConversationParticipant> builder)
    {
        builder.Property(entity => entity.ConversationId).IsRequired();
        builder.Property(entity => entity.Name).IsRequired()
            .HasMaxLength(GeneralConstants.ConversationParticipantNameMaxLength);
        builder.Property(entity => entity.Description).IsRequired(false)
            .HasMaxLength(GeneralConstants.ConversationParticipantDescriptionMaxLength);
        builder.Property(entity => entity.IsUser).IsRequired();
        builder.Property(entity => entity.Gender).IsRequired();
        builder.Property(entity => entity.Voice).IsRequired();

        builder.HasOne(entity => entity.Conversation)
            .WithMany(entity => entity.Participants)
            .HasForeignKey(entity => entity.ConversationId)
            .IsRequired()
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(entity => new { entity.ConversationId, entity.Name }).IsUnique();
    }
}
