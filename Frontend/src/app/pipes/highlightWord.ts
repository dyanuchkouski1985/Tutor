import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  standalone: true,
  name: 'highlightWord',
})
export class HighlightWordPipe implements PipeTransform {
  transform(input: string, word: string): string {
    return input
      .replaceAll(
        word[0].toUpperCase() + word.slice(1, word.length),
        '<i>' + word[0].toUpperCase() + word.slice(1, word.length) + '</i>',
      )
      .replaceAll(' ' + word + ' ', ' <i>' + word + '</i> ')
      .replaceAll(' ' + word, ' <i>' + word + '</i>');
  }
}
