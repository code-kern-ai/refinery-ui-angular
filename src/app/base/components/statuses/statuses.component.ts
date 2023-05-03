import { Component, Input, OnChanges } from '@angular/core';
import { Status } from './statuses.helper';

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
        case Status.READY:
          this.statusName = 'Ready to Use';
          this.color = 'green';
          break;
        case Status.UPDATING:
          this.statusName = 'Updating';
          this.color = 'yellow';
          break;
        case Status.NOT_READY:
          this.statusName = 'Not Ready';
          this.color = 'red';
          break;
      }
    } else {
      switch (this.status) {
        case Status.CREATED:
        case Status.RUNNING:
          this.dataTip = this.page === 'heuristics' ? 'Heuristic is currently being executed.' : 'Attribute is being calculated.';
          this.statusName = 'Running';
          this.color = 'yellow';
          break;
        case Status.STARTED:
          this.dataTip = 'Annotator has started labeling.';
          this.statusName = 'Started';
          this.color = 'yellow';
          break;
        case Status.FINISHED:
          this.dataTip = 'Heuristic was successfully executed.';
          this.statusName = 'Finished';
          this.color = 'green';
          break;
        case Status.FAILED:
          this.dataTip = (this.page === 'heuristics' ? 'Heuristic' : 'Attribute') + ' ran into errors.';
          this.statusName = 'Error';
          this.color = 'red';
          break;
        case Status.USABLE:
          this.dataTip = 'Attribute can be used.';
          this.statusName = 'Usable';
          this.color = 'green';
          break;
        case Status.UPLOADED:
          this.dataTip = 'Attribute was uploaded.';
          this.statusName = 'Uploaded';
          this.color = 'indigo';
          break;
        case Status.AUTOMATICALLY_CREATED:
          this.dataTip = 'Created during the upload process.';
          this.statusName = 'Auto. created';
          this.color = 'indigo';
          break;
        case Status.QUEUED:
          this.dataTip = 'Task is queued for processing.';
          this.statusName = 'Queued';
          this.color = 'gray';
          break;

        default:
          this.dataTip = (this.page === 'heuristics' ? 'Heuristic' : 'Attribute') + ' was successfully registered.';
          this.statusName = this.initialCaption;
          this.color = 'gray';
      }
    }

  }

}
