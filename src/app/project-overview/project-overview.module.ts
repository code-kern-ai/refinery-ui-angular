import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjectOverviewComponent } from './components/project-overview/project-overview.component';
import { BaseModule } from '../base/base.module';
import { ImportModule } from '../import/import.module';


import { ChartsModule } from '../charts/charts.module';
import { LabelDistributionBarChartComponent } from '../monitor/components/label-distribution-bar-chart/label-distribution-bar-chart.component';
import { ConfusionHeatmapComponent } from '../monitor/components/confusion-heatmap/confusion-heatmap.component';
import { InterAnnotatorComponent } from '../monitor/components/inter-annotator/inter-annotator.component';

@NgModule({
  declarations: [ProjectOverviewComponent, LabelDistributionBarChartComponent, ConfusionHeatmapComponent, InterAnnotatorComponent],
  imports: [
    CommonModule,
    BaseModule,
    ImportModule,
    ChartsModule],
})
export class ProjectOverviewModule { }
