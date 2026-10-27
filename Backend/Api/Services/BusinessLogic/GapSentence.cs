using Api.Constants;

namespace Api.Services.BusinessLogic;

public static class GapSentence
{
    public static bool HasSingleGap(string sentence)
    {
        if (string.IsNullOrWhiteSpace(sentence))
            return false;

        var index = sentence.IndexOf(GeneralConstants.GapPlaceholder, StringComparison.Ordinal);

        return index >= 0 && sentence.IndexOf(GeneralConstants.GapPlaceholder,
            index + GeneralConstants.GapPlaceholder.Length, StringComparison.Ordinal) < 0;
    }

    public static bool HasWordAfterGap(string sentence, string word)
    {
        var index = sentence.IndexOf(GeneralConstants.GapPlaceholder, StringComparison.Ordinal);

        return index >= 0 && WordLeak.Reveals(sentence[(index + GeneralConstants.GapPlaceholder.Length)..], word);
    }

    public static string Fill(string sentence, string text) =>
        string.Join(' ', sentence.Replace(GeneralConstants.GapPlaceholder, text)
            .Split(' ', StringSplitOptions.RemoveEmptyEntries));

    public static bool FillsTo(string sentence, string text, string expected) =>
        !string.IsNullOrWhiteSpace(expected)
        && string.Equals(Fill(sentence, text), Fill(expected, string.Empty), StringComparison.OrdinalIgnoreCase);
}
