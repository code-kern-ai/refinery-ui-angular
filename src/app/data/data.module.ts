import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseModule } from '../base/base.module';
import { DataBrowserComponent } from './components/data-browser/data-browser.component';

@NgModule({
  declarations: [DataBrowserComponent],
  imports: [CommonModule, BaseModule],
})
export class DataModule {}
