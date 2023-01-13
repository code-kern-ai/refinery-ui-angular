import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseModule } from '../base/base.module';
import { DataBrowserComponent } from './components/data-browser/data-browser.component';
import { RecordListComponent } from './components/record-list/record-list.component';

@NgModule({
  declarations: [DataBrowserComponent, RecordListComponent],
  imports: [CommonModule, BaseModule],
})
export class DataModule {}
