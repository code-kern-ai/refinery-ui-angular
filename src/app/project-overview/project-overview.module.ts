import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjectOverviewComponent } from './components/project-overview/project-overview.component';
import { BaseModule } from '../base/base.module';
import { ImportModule } from '../import/import.module';


import { ChartsModule } from '../charts/charts.module';
import { LabelDistributionBarChartComponent } from '../monitor/components/label-distribution-bar-chart/label-distribution-bar-chart.component';
import { ConfusionHeatmapComponent } from '../monitor/components/confusion-heatmap/confusion-heatmap.component';
import { InterAnnotatorComponent } from '../monitor/components/inter-annotator/inter-annotator.component';
import { ConfidenceLineChartComponent } from '../monitor/components/confidence-line-chart/confidence-line-chart.component';

@NgModule({
  declarations: [ProjectOverviewComponent, LabelDistributionBarChartComponent, ConfusionHeatmapComponent, InterAnnotatorComponent, ConfidenceLineChartComponent],
  imports: [
    CommonModule,
    BaseModule,
    ImportModule,
    ChartsModule
  ],
})
export class ProjectOverviewModule { }
