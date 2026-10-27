import {
  Component,
  EventEmitter,
  Input,
  Output,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';

export interface FileDropEvent {
  files: File[];
}

@Component({
  selector: 'app-file-drop',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <label
      class="ui-file-drop"
      [class.highlight]="isDragOver()"
      (dragenter)="onDragOver($event)"
      (dragover)="onDragOver($event)"
      (dragleave)="isDragOver.set(false)"
      (drop)="onDrop($event)"
    >
      <input type="file" [accept]="accept" (change)="onChange($event)" />
      <ng-content />
    </label>
  `,
})
export class FileDropComponent {
  @Input() accept = '';
  @Output() selected = new EventEmitter<FileDropEvent>();

  isDragOver = signal(false);

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragOver.set(true);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragOver.set(false);
    this.emit(event.dataTransfer?.files);
  }

  onChange(event: Event) {
    const input = event.target as HTMLInputElement;

    this.emit(input.files);
    input.value = '';
  }

  private emit(files: FileList | null | undefined) {
    if (files?.length) {
      this.selected.emit({ files: Array.from(files) });
    }
  }
}
