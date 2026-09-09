using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Api.Models.Configurations;

public class UserUsageConfiguration : IEntityTypeConfiguration<UserUsage>
{
    public void Configure(EntityTypeBuilder<UserUsage> builder)
    {
        builder.Property(entity => entity.UserId).IsRequired();
        builder.Property(entity => entity.UsageId).IsRequired();
        builder.Property(entity => entity.Position).IsRequired();

        builder.HasOne(entity => entity.Usage)
            .WithMany(entity => entity.UserUsages)
            .HasForeignKey(entity => entity.UsageId)
            .IsRequired()
            .OnDelete(DeleteBehavior.Restrict);
    }
}