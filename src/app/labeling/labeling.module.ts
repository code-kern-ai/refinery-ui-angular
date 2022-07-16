import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LabelingComponent } from './components/labeling.component';
import { BaseModule } from '../base/base.module';



@NgModule({
  declarations: [LabelingComponent],
  imports: [
    CommonModule,
    BaseModule
  ]
})
export class LabelingModule { }
