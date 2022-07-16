import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { ChartData } from 'src/app/base/entities/chart-data';
import { LabelDistribution } from 'src/app/base/entities/label-distribution';

@Component({
  selector: 'kern-label-distribution-bar-chart',
  templateUrl: './label-distribution-bar-chart.component.html',
  styleUrls: ['./label-distribution-bar-chart.component.scss'],
})
export class LabelDistributionBarChartComponent implements OnInit, OnChanges {
  @Input() dataInput: LabelDistribution[];

  chartData: ChartData[] = [];

  dataGroupedBarChart: any[];

  constructor() { }
  changeDataStructure(labelDistribution: LabelDistribution): ChartData {
    const group = labelDistribution.labelName;
    const valuesScaleManually = {
      name: 'Manually labeled',
      value: labelDistribution.ratioScaleManually,
      valueAbsolute: labelDistribution.absoluteScaleManually,
      color: '#A2f2AF',
    };
    const valuesScaleProgrammatically = {
      name: 'Weakly supervised',
      value: labelDistribution.ratioScaleProgrammatically,
      valueAbsolute: labelDistribution.absoluteScaleProgrammatically,
      color: '#3B82F6',
    };

    const chartData = new ChartData();
    chartData.group = group;
    chartData.values = [
      valuesScaleProgrammatically,
      valuesScaleManually,
    ];
    return chartData;
  }

  ngOnInit(): void {

  }

  ngOnChanges(changes: SimpleChanges): void {
    this.initBar()
  }

  initBar() {
    this.chartData = [];
    this.dataInput.map((element) => {
      this.chartData.push(this.changeDataStructure(element));
    });

    this.dataGroupedBarChart = this.chartData;
  }
}
