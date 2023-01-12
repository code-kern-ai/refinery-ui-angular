import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Attributes, RecordDisplay, RecordDisplayOptions } from './record-display.helper';

@Component({
  selector: 'kern-record-display',
  templateUrl: './record-display.component.html',
  styleUrls: ['./record-display.component.scss']
})
export class RecordDisplayComponent implements OnChanges {

  @Input() record: RecordDisplay;
  @Input() attributes: Attributes;
  @Input() recordDisplayOptions: RecordDisplayOptions;

  constructor() { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.record) {
      if (!this.record.hasOwnProperty('data')) {
        if (this.record.hasOwnProperty('fullRecordData')) {
          this.record.data = this.record.fullRecordData;
        }
        if (this.record.hasOwnProperty('recordData')) {
          this.record.data = this.record.recordData;
        }
      }
    }
    if (changes.recordCardOptions) {
      const firstEl = this.recordDisplayOptions.attributesSortOrder[0];
      if (!firstEl.hasOwnProperty('key')) {
        this.recordDisplayOptions.attributesSortOrder.forEach((attribute, index) => {
          attribute.key = attribute.id;
        });
      }
    }
  }
}
