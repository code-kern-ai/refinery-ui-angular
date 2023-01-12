import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Attributes } from 'src/app/base/components/record-display/record-display.helper';
import { ColumnData, RecordListOptions } from './record-list-helper';

@Component({
  selector: 'kern-record-list',
  templateUrl: './record-list.component.html',
  styleUrls: ['./record-list.component.scss']
})
export class RecordListComponent implements OnInit {

  @Input() recordList: any[];
  @Input() attributes: Attributes;
  @Input() recordListOptions: RecordListOptions;

  @Output() indexHuddleData = new EventEmitter<number>();
  @Output() similarSearch = new EventEmitter();

  columnsData: ColumnData[];

  constructor() { }

  ngOnInit(): void {
    this.columnsData = this.prepareColumnsData();
  }


  storePreliminaryRecordIds(index: number) {
    this.indexHuddleData.emit(index);
  }

  requestSimilarSearch() {
    this.similarSearch.emit();
  }

  prepareColumnsData() {
    const columnsData = [];
    columnsData.push({
      field: 'type',
      displayName: 'Type',
      order: 1
    });
    columnsData.push({
      field: 'task',
      displayName: 'Task',
      order: 2
    });
    columnsData.push({
      field: 'label',
      displayName: 'Label',
      order: 3,
    });
    columnsData.push({
      field: 'amount',
      displayName: 'Amount',
      order: 4
    });
    columnsData.push({
      field: 'confidenceAvg',
      displayName: 'Avg.confidence',
      order: 5
    });
    return columnsData;
  }
}
