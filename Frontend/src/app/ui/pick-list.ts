import {
  CdkDrag,
  CdkDragDrop,
  CdkDropList,
  CdkDropListGroup,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  ContentChild,
  EventEmitter,
  Input,
  Output,
  TemplateRef,
  ChangeDetectionStrategy,
} from '@angular/core';

export interface PickListMoveEvent<T = any> {
  items: T[];
}

@Component({
  selector: 'app-pick-list',
  imports: [CdkDropListGroup, CdkDropList, CdkDrag, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="ui-picklist" cdkDropListGroup>
      @for (side of sides; track side) {
        <div class="ui-picklist-list-container">
          <div class="ui-picklist-header">
            <ng-container
              *ngTemplateOutlet="side === 'source' ? sourceHeaderTemplate : targetHeaderTemplate"
            />
          </div>
          <div
            class="ui-picklist-list"
            cdkDropList
            [cdkDropListData]="side === 'source' ? source : target"
            (cdkDropListDropped)="onDrop($event)"
          >
            @for (item of side === 'source' ? source : target; track item) {
              <div class="ui-picklist-option" cdkDrag (dblclick)="move(item, side)">
                <ng-container *ngTemplateOutlet="itemTemplate; context: { $implicit: item }" />
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class PickListComponent<T = any> {
  @Input() source: T[] = [];
  @Input() target: T[] = [];

  @Output() moveToTarget = new EventEmitter<PickListMoveEvent<T>>();
  @Output() moveToSource = new EventEmitter<PickListMoveEvent<T>>();

  @ContentChild('sourceHeader') sourceHeaderTemplate?: TemplateRef<unknown>;
  @ContentChild('targetHeader') targetHeaderTemplate?: TemplateRef<unknown>;
  @ContentChild('item') itemTemplate?: TemplateRef<unknown>;

  readonly sides = ['source', 'target'] as const;

  onDrop(event: CdkDragDrop<T[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      return;
    }

    const item = event.previousContainer.data[event.previousIndex];

    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex,
    );
    this.emitMove(item, event.container.data === this.target);
  }

  move(item: T, side: 'source' | 'target') {
    const from = side === 'source' ? this.source : this.target;
    const to = side === 'source' ? this.target : this.source;
    const index = from.indexOf(item);

    if (index < 0) {
      return;
    }

    transferArrayItem(from, to, index, to.length);
    this.emitMove(item, side === 'source');
  }

  private emitMove(item: T, isToTarget: boolean) {
    (isToTarget ? this.moveToTarget : this.moveToSource).emit({ items: [item] });
  }
}
