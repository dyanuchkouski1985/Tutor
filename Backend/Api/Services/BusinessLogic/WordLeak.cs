using System.Text.RegularExpressions;
using Api.Constants;

namespace Api.Services.BusinessLogic;

public static class WordLeak
{
    public static bool Reveals(string text, string word)
    {
        var stem = word.Length >= GeneralConstants.WordLeakStemMinWordLength
            ? word[..Math.Max(GeneralConstants.WordLeakStemMinLength, word.Length - 2)]
            : word;

        return Regex.IsMatch(text, $@"(?<!\w){Regex.Escape(stem)}",
            RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
    }
}
