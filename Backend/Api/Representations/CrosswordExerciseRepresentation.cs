using Api.Constants;
using Api.Enums;

namespace Api.Representations;

public class CrosswordExerciseRepresentation
{
    public BoardCell[][] Board { get; } =
        new BoardCell[GeneralConstants.CrosswordBoardSize][];

    public List<CrosswordRepresentation> VerticalWords { get; set; } = [];
    public List<CrosswordRepresentation> HorizontalWords { get; set; } = [];
}

public class BoardCell
{
    public Direction Direction { get; set; }
    public string Value { get; init; }
    public int? VerticalWordId { get; set; }
    public int? HorizontalWordId { get; set; }
}

public class CrosswordRepresentation
{
    public int StartY { get; init; }
    public int StartX { get; init; }
    public int WordId { get; init; }
    public string Value { get; init; }
    public WordLearningProgress WordLearningProgress {get; init; }
    public List<string> Translations { get; } = [];
    public List<int> PictureIds { get; } = [];
    public List<string> Usages { get; } = [];
    public bool IsAnyNewPictureAvailable { get; set; }
}