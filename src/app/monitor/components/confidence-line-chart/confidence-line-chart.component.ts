import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'kern-confidence-line-chart',
  templateUrl: './confidence-line-chart.component.html',
  styleUrls: ['./confidence-line-chart.component.scss'],
})
export class ConfidenceLineChartComponent implements OnInit {
  constructor() { }
  @Input() dataInput: any;

  ngOnInit(): void {
  }
}
