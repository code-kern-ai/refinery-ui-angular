import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'kern-record-card',
  templateUrl: './record-card.component.html',
  styleUrls: ['./record-card.component.scss']
})
export class RecordCardComponent implements OnInit {

  @Input() record: any;
  @Input() attributesSortOrder: any;
  @Input() index: number;
  @Input() extendedRecords: any;
  @Input() similarSearchHelper: any;
  @Input() recordComments: any;
  @Input() attributes: any;
  @Input() dataBrowserModals: any;

  @Output() preliminaryRecordIds = new EventEmitter<number>();

  constructor() { }

  ngOnInit(): void {
  }

  storePreliminaryRecordIds(index: number) {
    this.preliminaryRecordIds.emit(index);
  }

  getBackground(color) {
    return `bg-${color}-100`
  }

  getText(color) {
    return `text-${color}-700`
  }

  getBorder(color) {
    return `border-${color}-400`
  }

  getHover(color) {
    return `hover:bg-${color}-200`
  }
}
