import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'kern-heuristic-statuses',
  templateUrl: './heuristic-statuses.component.html',
  styleUrls: ['./heuristic-statuses.component.scss']
})
export class HeuristicStatusesComponent implements OnInit {

  @Input() status: string;
  @Input() tooltipPosition: string = 'tooltip-bottom';

  constructor() { }

  ngOnInit(): void {
  }

}
