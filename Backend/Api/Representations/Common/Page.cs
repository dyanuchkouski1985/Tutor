namespace Api.Representations.Common;

public class Page<T>
{
    public IEnumerable<T> Items { get; set; }
    public int From { get; set; }
    public int Count { get; set; }
    public int ItemsCount { get; set; }
}