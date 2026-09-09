using Api.Enums;

namespace Api.Representations;

public sealed record SuggestionRepresentation(int WordId, string Value, WordLearningProgress? LearningProgress);
