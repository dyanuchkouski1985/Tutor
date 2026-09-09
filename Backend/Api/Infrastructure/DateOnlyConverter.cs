using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace Api.Infrastructure;

public class DateOnlyConverter()
    : ValueConverter<DateOnly, DateTime>(d => d.ToDateTime(TimeOnly.MinValue), d => DateOnly.FromDateTime(d));