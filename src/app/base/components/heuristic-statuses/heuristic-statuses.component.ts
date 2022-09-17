import { Component, Input, OnChanges } from '@angular/core';

@Component({
  selector: 'kern-heuristic-statuses',
  templateUrl: './heuristic-statuses.component.html',
  styleUrls: ['./heuristic-statuses.component.scss']
})
export class HeuristicStatusesComponent implements OnChanges {

  @Input() status: string;
  @Input() tooltipPosition: string = 'tooltip-bottom';

  dataTip: string;
  statusName: string;
  color: string;

  constructor() { }

  ngOnChanges(): void {
    switch (this.status) {
      case 'CREATED':
        this.dataTip = 'Heuristic is currently being executed.';
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
        this.dataTip = 'Heuristic ran into errors.';
        this.statusName = 'Error';
        this.color = 'red';
        break;
      default:
        this.dataTip = 'Heuristic was successfully registered.';
        this.statusName = 'Initial';
        this.color = 'gray';
    }
  }

}
