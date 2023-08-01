import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Attributes } from 'src/app/base/components/record-display/record-display.helper';
import { DATA_BROWSER_TABLE_COLUMN_HEADERS, RecordListOptions } from './record-list-helper';

@Component({
  selector: 'kern-record-list',
  templateUrl: './record-list.component.html',
  styleUrls: ['./record-list.component.scss']
})
export class RecordListComponent {

  @Input() recordList: any[];
  @Input() attributes: Attributes;
  @Input() recordListOptions: RecordListOptions;

  @Output() recordClicked = new EventEmitter<number>();
  @Output() similaritySearchRequested = new EventEmitter();
  @Output() initFilterAttributeData = new EventEmitter();


  columnsData = DATA_BROWSER_TABLE_COLUMN_HEADERS;

  constructor() { }

  storePreliminaryRecordIds(index: number) {
    this.recordClicked.emit(index);
  }

  requestSimilarSearch() {
    this.similaritySearchRequested.emit();
  }

  setInitFilterAttributeData() {
    this.initFilterAttributeData.emit();
  }
}
