using Api.Constants;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Api.Models.Configurations;

public class ConversationConfiguration : IEntityTypeConfiguration<Conversation>
{
    public void Configure(EntityTypeBuilder<Conversation> builder)
    {
        builder.Property(entity => entity.UserId).IsRequired();
        builder.Property(entity => entity.Language).IsRequired();
        builder.Property(entity => entity.Title).IsRequired()
            .HasMaxLength(GeneralConstants.ConversationTitleMaxLength);
        builder.Property(entity => entity.Context).IsRequired()
            .HasMaxLength(GeneralConstants.ConversationContextMaxLength);
        builder.Property(entity => entity.AutoFormat).IsRequired();
        builder.Property(entity => entity.SendImmediately).IsRequired();
        builder.Property(entity => entity.NextSpeakerId).IsRequired(false);
        builder.Property(entity => entity.Summary).IsRequired(false)
            .HasMaxLength(GeneralConstants.ConversationSummaryMaxLength);
        builder.Property(entity => entity.SummaryMessageId).IsRequired(false);
        builder.Property(entity => entity.CreatedDate).IsRequired();
        builder.Property(entity => entity.LastActivityDate).IsRequired();

        builder.HasOne(entity => entity.NextSpeaker)
            .WithMany()
            .HasForeignKey(entity => entity.NextSpeakerId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.NoAction);

        builder.HasIndex(entity => new { entity.UserId, entity.Language });
    }
}
