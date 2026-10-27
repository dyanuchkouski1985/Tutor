import { AfterViewInit, booleanAttribute, Directive, ElementRef, Input } from '@angular/core';

@Directive({
  selector: '[appAutoFocus]',
})
export class AutoFocusDirective implements AfterViewInit {
  @Input({ alias: 'appAutoFocus', transform: booleanAttribute }) isEnabled = true;

  constructor(private readonly elementRef: ElementRef<HTMLElement>) {}

  ngAfterViewInit() {
    if (this.isEnabled) {
      setTimeout(() => this.elementRef.nativeElement.focus());
    }
  }
}
