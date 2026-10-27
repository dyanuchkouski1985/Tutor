import {
  booleanAttribute,
  Component,
  EmbeddedViewRef,
  Input,
  OnDestroy,
  TemplateRef,
  ViewChild,
  ViewContainerRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { SvgIconComponent } from 'angular-svg-icon';
import { blockBodyScroll, unblockBodyScroll } from './body-scroll';

@Component({
  selector: 'app-image',
  imports: [SvgIconComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <span class="ui-image" [class.ui-image-preview]="preview">
      <img [src]="src" [alt]="alt" />
      @if (preview) {
        <button type="button" class="ui-image-preview-mask" aria-label="Preview" (click)="open()">
          <svg-icon src="../../../assets/images/svg/search.svg" class="search-icon"></svg-icon>
        </button>
      }
    </span>

    <ng-template #previewTemplate>
      <div class="ui-image-mask" (click)="close()">
        <div class="ui-image-toolbar" (click)="$event.stopPropagation()">
          <button type="button" class="ui-image-action" aria-label="Close" (click)="close()">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <img class="ui-image-original" [src]="src" [alt]="alt" (click)="$event.stopPropagation()" />
      </div>
    </ng-template>
  `,
})
export class ImageComponent implements OnDestroy {
  @Input() src = '';
  @Input() alt = '';
  @Input({ transform: booleanAttribute }) preview = false;

  @ViewChild('previewTemplate') previewTemplate!: TemplateRef<unknown>;

  private readonly onKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      this.close();
    }
  };

  private previewView: EmbeddedViewRef<unknown> | null = null;
  private isLeaving = false;

  constructor(private readonly viewContainerRef: ViewContainerRef) {}

  ngOnDestroy() {
    this.destroyPreview();
  }

  open() {
    if (this.previewView) {
      this.destroyPreview();
    }

    this.previewView = this.viewContainerRef.createEmbeddedView(this.previewTemplate);
    this.previewView.detectChanges();
    this.previewView.rootNodes.forEach((node) => document.body.appendChild(node));
    blockBodyScroll();
    window.addEventListener('keydown', this.onKeydown, true);
  }

  close() {
    if (!this.previewView || this.isLeaving) {
      return;
    }

    const previewView = this.previewView;
    const mask = previewView.rootNodes.find((node) => node instanceof HTMLElement);

    if (mask) {
      const { width, height } = mask.getBoundingClientRect();
      mask.style.width = `${width}px`;
      mask.style.height = `${height}px`;
    }

    this.isLeaving = true;
    unblockBodyScroll();
    window.removeEventListener('keydown', this.onKeydown, true);
    mask?.classList.add('ui-image-leave');
    const animations = mask?.getAnimations({ subtree: true }) ?? [];

    if (!animations.length) {
      this.destroyPreview();
      return;
    }

    Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
      if (this.previewView === previewView) {
        this.destroyPreview();
      }
    });
  }

  private destroyPreview() {
    if (!this.previewView) {
      return;
    }

    this.previewView.destroy();
    this.previewView = null;
    window.removeEventListener('keydown', this.onKeydown, true);

    if (!this.isLeaving) {
      unblockBodyScroll();
    }

    this.isLeaving = false;
  }
}
