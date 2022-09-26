import { Component, Input } from '@angular/core';

@Component({
  selector: 'kern-logs',
  templateUrl: './logs.component.html',
  styleUrls: ['./logs.component.scss']
})
export class LogsComponent {

  @Input() logs: string[];

  constructor() { }


}
