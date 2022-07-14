import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'kern-confusion-heatmap',
  templateUrl: './confusion-heatmap.component.html',
  styleUrls: ['./confusion-heatmap.component.scss'],
})
export class ConfusionHeatmapComponent implements OnInit {
  constructor() { }
  @Input() dataInput: any;

  ngOnInit(): void {
  }
}
