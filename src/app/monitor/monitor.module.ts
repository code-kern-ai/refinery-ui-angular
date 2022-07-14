import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseModule } from '../base/base.module';
import { ChartsModule } from '../charts/charts.module';



@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    BaseModule,
    ChartsModule
  ]
})
export class MonitorModule { }
