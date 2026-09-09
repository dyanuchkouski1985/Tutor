using Microsoft.EntityFrameworkCore;

namespace Api.Models;

public class TutorContext(DbContextOptions options) : DbContext(options)
{
    public DbSet<Word> Words { get; init; }
    public DbSet<Translation> Translations { get; init; }
    public DbSet<UserTranslation> UserTranslations { get; init; }
    public DbSet<Picture> Pictures { get; init; }
    public DbSet<UserPicture> UserPictures { get; init; }
    public DbSet<Usage> Usages { get; init; }
    public DbSet<UserUsage> UserUsages { get; init; }
    public DbSet<UserWordLearningProgress> UserWordLearningProgresses { get; init; }
    public DbSet<UserStatistic> UserStatistics { get; init; }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.ApplyConfigurationsFromAssembly(typeof(TutorContext).Assembly);
    }

    protected override void ConfigureConventions(ModelConfigurationBuilder builder)
    {
        builder.Properties<DateOnly>()
            .HaveConversion<Infrastructure.DateOnlyConverter>()
            .HaveColumnType("date");
    }
}