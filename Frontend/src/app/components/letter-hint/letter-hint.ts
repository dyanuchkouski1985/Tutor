import {
  afterNextRender,
  Component,
  ElementRef,
  EventEmitter,
  Injector,
  Input,
  OnChanges,
  Output,
  QueryList,
  ViewChildren,
  ChangeDetectionStrategy,
} from '@angular/core';

interface LetterTile {
  value: string;
  cellIndex: number | null;
}

@Component({
  selector: 'app-letter-hint',
  imports: [],
  templateUrl: './letter-hint.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./letter-hint.scss'],
})
export class LetterHintComponent implements OnChanges {
  @Input({ required: true }) letters: string[] = [];
  @Output() answerChange = new EventEmitter<string>();

  @ViewChildren('cell') cellInputs?: QueryList<ElementRef<HTMLInputElement>>;

  cells: (LetterTile | null)[] = [];
  tiles: LetterTile[] = [];

  constructor(private readonly injector: Injector) {}

  ngOnChanges() {
    const letters = [...this.letters];
    for (let i = letters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [letters[i], letters[j]] = [letters[j], letters[i]];
    }

    this.tiles = letters.map((value) => ({ value, cellIndex: null }));
    this.cells = Array(letters.length).fill(null);
    this.emitAnswer();
    afterNextRender(() => this.focusCell(0), { injector: this.injector });
  }

  displayValue(value: string) {
    return value === ' ' ? ' ' : value;
  }

  onTileClick(tile: LetterTile) {
    if (tile.cellIndex !== null) {
      return;
    }

    const index = this.cells.findIndex((cell) => !cell);
    if (index === -1) {
      return;
    }

    this.place(tile, index);
    this.focusCell(this.nextEmptyIndex(index));
  }

  onCellKeyDown(event: KeyboardEvent, index: number) {
    const key = event.key;

    const isShortcut =
      (event.ctrlKey || event.metaKey || event.altKey) && !event.getModifierState('AltGraph');

    if (key === 'Enter' || key === 'Tab' || isShortcut) {
      return;
    }

    event.preventDefault();

    if (key === 'ArrowLeft') {
      this.focusCell(index - 1);
    } else if (key === 'ArrowRight') {
      this.focusCell(index + 1);
    } else if (key === 'Backspace') {
      if (this.cells[index]) {
        this.clear(index);
      } else if (index > 0) {
        this.clear(index - 1);
        this.focusCell(index - 1);
      }
    } else if (key === 'Delete') {
      this.clear(index);
    } else if (key.length === 1) {
      const current = this.cells[index];
      if (current) {
        this.clear(index);
      }

      const tile =
        this.tiles.find((t) => t.cellIndex === null && t.value === key) ??
        this.tiles.find((t) => t.cellIndex === null && t.value.toLowerCase() === key.toLowerCase());

      if (!tile) {
        if (current) {
          this.place(current, index);
        }
        return;
      }

      this.place(tile, index);
      this.focusCell(index + 1);
    }
  }

  onCellInput(event: Event, index: number) {
    (event.target as HTMLInputElement).value = this.cells[index]?.value ?? '';
  }

  private place(tile: LetterTile, index: number) {
    tile.cellIndex = index;
    this.cells[index] = tile;
    this.emitAnswer();
  }

  private clear(index: number) {
    const tile = this.cells[index];
    if (!tile) {
      return;
    }

    tile.cellIndex = null;
    this.cells[index] = null;
    this.emitAnswer();
  }

  private nextEmptyIndex(after: number) {
    const index = this.cells.findIndex((cell, i) => i > after && !cell);
    return index === -1 ? after : index;
  }

  private focusCell(index: number) {
    this.cellInputs?.get(index)?.nativeElement.focus();
  }

  private emitAnswer() {
    this.answerChange.emit(
      this.cells.every((cell) => cell) ? this.cells.map((cell) => cell!.value).join('') : '',
    );
  }
}
