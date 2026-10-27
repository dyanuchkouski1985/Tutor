import {
  AfterViewInit,
  Directive,
  ElementRef,
  HostListener,
  OnDestroy,
  Optional,
} from '@angular/core';
import { NgModel } from '@angular/forms';
import { Subscription } from 'rxjs';

@Directive({
  selector: 'textarea[appAutoResize]',
  host: { style: 'overflow: hidden; resize: none' },
})
export class AutoResizeDirective implements AfterViewInit, OnDestroy {
  private subscription: Subscription | undefined;

  constructor(
    private readonly elementRef: ElementRef<HTMLTextAreaElement>,
    @Optional() private readonly ngModel: NgModel | null,
  ) {}

  ngAfterViewInit() {
    this.resize();
    this.subscription = this.ngModel?.valueChanges?.subscribe(() =>
      requestAnimationFrame(() => this.resize()),
    );
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }

  @HostListener('input')
  resize() {
    const textarea = this.elementRef.nativeElement;

    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > parseFloat(getComputedStyle(textarea).maxHeight) ? 'auto' : 'hidden';
  }
}
