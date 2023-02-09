import { Component, Input, OnChanges } from '@angular/core';

@Component({
  selector: 'kern-statuses',
  templateUrl: './statuses.component.html',
  styleUrls: ['./statuses.component.scss']
})
export class StatusesComponent implements OnChanges {

  @Input() status: string;
  @Input() tooltipPosition: string = 'tooltip-bottom';
  @Input() page: string = 'heuristics';
  @Input() initialCaption: string = 'Initial';

  dataTip: string;
  statusName: string;
  color: string;

  constructor() { }

  ngOnChanges(): void {
    if (this.page == 'gates-integrator') {
      switch (this.status) {
        case 'READY':
          this.statusName = 'Ready to Use';
          this.color = 'green';
          break;
        case 'UPDATING':
          this.statusName = 'Updating';
          this.color = 'yellow';
          break;
        case 'NOT_READY':
          this.statusName = 'Not Ready';
          this.color = 'red';
          break;
      }
    } else {
      switch (this.status) {
        case 'CREATED':
        case 'RUNNING':
          this.dataTip = this.page === 'heuristics' ? 'Heuristic is currently being executed.' : 'Attribute is being calculated.';
          this.statusName = 'Running';
          this.color = 'yellow';
          break;
        case 'STARTED':
          this.dataTip = 'Annotator has started labeling.';
          this.statusName = 'Started';
          this.color = 'yellow';
          break;
        case 'FINISHED':
          this.dataTip = 'Heuristic was successfully executed.';
          this.statusName = 'Finished';
          this.color = 'green';
          break;
        case 'FAILED':
          this.dataTip = (this.page === 'heuristics' ? 'Heuristic' : 'Attribute') + ' ran into errors.';
          this.statusName = 'Error';
          this.color = 'red';
          break;
        case 'USABLE':
          this.dataTip = 'Attribute can be used.';
          this.statusName = 'Usable';
          this.color = 'green';
          break;
        case 'UPLOADED':
          this.dataTip = 'Attribute was uploaded.';
          this.statusName = 'Uploaded';
          this.color = 'indigo';
          break;
        case 'AUTOMATICALLY_CREATED':
          this.dataTip = 'Created during the upload process.';
          this.statusName = 'Auto. created';
          this.color = 'indigo';
          break;

        default:
          this.dataTip = (this.page === 'heuristics' ? 'Heuristic' : 'Attribute') + ' was successfully registered.';
          this.statusName = this.initialCaption;
          this.color = 'gray';
      }
    }

  }

}
