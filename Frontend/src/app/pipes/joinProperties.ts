import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  standalone: true,
  name: 'joinProperties',
})
export class JoinPropertiesPipe implements PipeTransform {
  transform(input: any[], key: string): string {
    return input.map((x) => x[key]).join('; ');
  }
}
