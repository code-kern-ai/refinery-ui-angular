import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Attributes } from 'src/app/base/components/record-display/record-display.helper';
import { DATA_BROWSER_TABLE_COLUMN_HEADERS, RecordListOptions } from './record-list-helper';
import { UserManager } from 'src/app/util/user-manager';
import { UserRole } from 'src/app/base/enum/graphql-enums';

@Component({
  selector: 'kern-record-list',
  templateUrl: './record-list.component.html',
  styleUrls: ['./record-list.component.scss']
})
export class RecordListComponent implements OnInit {

  @Input() recordList: any[];
  @Input() attributes: Attributes;
  @Input() recordListOptions: RecordListOptions;

  @Output() recordClicked = new EventEmitter<number>();
  @Output() editClicked = new EventEmitter<number>();
  @Output() similaritySearchRequested = new EventEmitter();
  @Output() initFilterAttributeData = new EventEmitter();

  isEngineer = false;

  columnsData = DATA_BROWSER_TABLE_COLUMN_HEADERS;

  constructor() { }

  ngOnInit(): void {
    UserManager.registerAfterInitActionOrRun(this, () => this.isEngineer = UserManager.currentRole == UserRole.ENGINEER, true);
  }

  storePreliminaryRecordIds(index: number) {
    this.recordClicked.emit(index);
  }

  emitEditRecord(index: number) {
    this.editClicked.emit(index);
  }

  requestSimilarSearch() {
    this.similaritySearchRequested.emit();
  }

  setInitFilterAttributeData() {
    this.initFilterAttributeData.emit();
  }
}
