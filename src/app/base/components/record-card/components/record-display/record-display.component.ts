import { Component, Input } from '@angular/core';
import { RecordCardOptions } from '../../record-card-helper';
import { Attribute, DataBrowserRecord } from '../../record-card.types';

@Component({
  selector: 'kern-record-display',
  templateUrl: './record-display.component.html',
  styleUrls: ['./record-display.component.scss']
})
export class RecordDisplayComponent {

  @Input() record: DataBrowserRecord;
  @Input() attributes: Attribute;
  @Input() recordCardOptions: RecordCardOptions;

  constructor() { }

}
