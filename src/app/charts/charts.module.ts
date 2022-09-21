import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GroupedBarChartComponent } from './components/grouped-bar-chart/grouped-bar-chart.component';
import { AppRoutingModule } from '../app-routing.module';
import { BarChartComponent } from './components/bar-chart/bar-chart.component';
import { HorizontalGroupedBarChartComponent } from './components/horizontal-grouped-bar-chart/horizontal-grouped-bar-chart.component';
import { BoxplotComponent } from './components/boxplot/boxplot.component';
import { ConfusionMatrixComponent } from './components/confusion-matrix/confusion-matrix.component';
import { LineChartComponent } from './components/line-chart/line-chart.component';



@NgModule({
  declarations: [LineChartComponent, GroupedBarChartComponent, BarChartComponent, HorizontalGroupedBarChartComponent, BoxplotComponent, ConfusionMatrixComponent],
  imports: [
    CommonModule,
    AppRoutingModule
  ],
  exports: [
    LineChartComponent,
    GroupedBarChartComponent,
    BarChartComponent,
    HorizontalGroupedBarChartComponent,
    BoxplotComponent,
    ConfusionMatrixComponent,
  ]
})
export class ChartsModule { }
