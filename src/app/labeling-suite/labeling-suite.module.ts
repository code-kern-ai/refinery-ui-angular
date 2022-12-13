import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseModule } from '../base/base.module';
import { LabelingSuiteComponent } from './main-component/labeling-suite.component';
import { LabelingSuiteOverviewTableComponent } from './sub-components/overview-table/overview-table.component';
import { LabelingSuiteTaskHeaderComponent } from './sub-components/task-header/task-header.component';
import { LabelingSuiteLabelingComponent } from './sub-components/labeling/labeling.component';

@NgModule({
  declarations: [
    LabelingSuiteComponent,
    LabelingSuiteOverviewTableComponent,
    LabelingSuiteTaskHeaderComponent,
    LabelingSuiteLabelingComponent,
  ],
  imports: [CommonModule, BaseModule],
})
export class LabelingSuiteModule {}
