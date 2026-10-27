import { Dialog, DIALOG_DATA, DialogRef as CdkDialogRef } from '@angular/cdk/dialog';
import { hasModifierKey } from '@angular/cdk/keycodes';
import { NoopScrollStrategy, Overlay } from '@angular/cdk/overlay';
import { NgComponentOutlet } from '@angular/common';
import {
  Component,
  inject,
  Injectable,
  Injector,
  Type,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Observable } from 'rxjs';
import { blockBodyScroll, unblockBodyScroll } from './body-scroll';

export interface DialogOptions<D = any> {
  header?: string;
  styleClass?: string;
  data?: D;
  focusOnShow?: boolean;
  waitUntilReady?: boolean;
}

const revealTimeout = 1000;
const leaveDuration = 150;

export class DialogConfig<D = any> {
  data?: D;
}

export class DialogRef<R = any> {
  onClose!: Observable<R | undefined>;
  private cdkDialogRef!: CdkDialogRef<R>;

  attach(cdkDialogRef: CdkDialogRef<R>) {
    this.cdkDialogRef = cdkDialogRef;
    this.onClose = cdkDialogRef.closed;
    cdkDialogRef.closed.subscribe(() => this.releaseBodyScroll());
  }

  ready() {
    this.cdkDialogRef.removePanelClass('ui-dialog-pending');
  }

  close(result?: R) {
    if (this.isClosing) {
      return;
    }

    this.isClosing = true;
    const host = this.cdkDialogRef.overlayRef.hostElement;

    if (host) {
      host.style.width = `${host.getBoundingClientRect().width}px`;
    }

    this.releaseBodyScroll();
    this.cdkDialogRef.addPanelClass('ui-dialog-leave');
    this.cdkDialogRef.overlayRef.backdropElement?.classList.remove('cdk-overlay-backdrop-showing');
    setTimeout(() => this.cdkDialogRef.close(result), leaveDuration);
  }

  private isClosing = false;
  private isBodyScrollReleased = false;

  private releaseBodyScroll() {
    if (!this.isBodyScrollReleased) {
      this.isBodyScrollReleased = true;
      unblockBodyScroll();
    }
  }
}

interface DialogShellData {
  component: Type<unknown>;
  header?: string;
  dialogRef: DialogRef;
  config: DialogConfig;
}

@Component({
  selector: 'app-dialog-shell',
  imports: [NgComponentOutlet],
  template: `
    <div class="ui-dialog-header">
      <span class="ui-dialog-title">{{ shellData.header }}</span>
      <button
        type="button"
        class="ui-dialog-close"
        tabindex="-1"
        aria-label="Close"
        (click)="shellData.dialogRef.close()"
      >
        <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true">
          <path
            d="M3 3 11 11M11 3 3 11"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
      </button>
    </div>
    <div class="ui-dialog-content">
      <ng-container *ngComponentOutlet="shellData.component; injector: contentInjector" />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  host: { class: 'ui-dialog-shell' },
})
export class DialogShellComponent {
  shellData = inject<DialogShellData>(DIALOG_DATA);
  contentInjector = Injector.create({
    providers: [
      { provide: DialogRef, useValue: this.shellData.dialogRef },
      { provide: DialogConfig, useValue: this.shellData.config },
    ],
    parent: inject(Injector),
  });
}

@Injectable({ providedIn: 'root' })
export class DialogService {
  private readonly dialog = inject(Dialog);
  private readonly overlay = inject(Overlay);

  open<R = any, D = any>(component: Type<unknown>, options: DialogOptions<D> = {}) {
    const dialogRef = new DialogRef<R>();
    const config: DialogConfig<D> = { data: options.data };

    blockBodyScroll();

    const cdkDialogRef = this.dialog.open<R, DialogShellData>(DialogShellComponent, {
      data: { component, header: options.header, dialogRef, config },
      panelClass: [
        'ui-dialog',
        ...(options.styleClass ? [options.styleClass] : []),
        ...(options.waitUntilReady ? ['ui-dialog-pending'] : []),
      ],
      backdropClass: 'ui-dialog-backdrop',
      disableClose: true,
      autoFocus: options.focusOnShow === false ? 'dialog' : 'first-tabbable',
      ariaLabel: options.header,
      maxWidth: 'none',
      scrollStrategy: new NoopScrollStrategy(),
      positionStrategy: this.overlay.position().global().centerHorizontally().top('5vh'),
    });

    dialogRef.attach(cdkDialogRef);
    cdkDialogRef.backdropClick.subscribe(() => dialogRef.close());
    cdkDialogRef.keydownEvents.subscribe((event) => {
      if (event.key === 'Escape' && !hasModifierKey(event)) {
        event.preventDefault();
        dialogRef.close();
      }
    });

    if (options.waitUntilReady) {
      setTimeout(() => dialogRef.ready(), revealTimeout);
    }

    return dialogRef;
  }
}
