import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  standalone: true,
  name: 'mapProperty',
})
export class MapPropertyPipe implements PipeTransform {
  transform(input: any[], key: string): any[] {
    return input.map((x) => x[key]);
  }
}
