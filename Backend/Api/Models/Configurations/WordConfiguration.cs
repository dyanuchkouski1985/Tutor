using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Api.Models.Configurations;

public class WordConfiguration : IEntityTypeConfiguration<Word>
{
    public void Configure(EntityTypeBuilder<Word> builder)
    {
        builder.Property(entity => entity.Value).IsRequired();
        builder.Property(entity => entity.PronunciationData).IsRequired(false);
        builder.Property(entity => entity.PronunciationContentType).IsRequired(false);
        builder.Property(entity => entity.PronunciationExtension).IsRequired(false);
        builder.Property(entity => entity.PronunciationLength).IsRequired(false);
    }
}