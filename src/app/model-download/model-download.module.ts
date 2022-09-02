import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseModule } from '../base/base.module';
import { ModelDownloadComponent } from './pages/model-download/model-download.component';
import { ModelDownloadComponentComponent } from './components/model-download-component/model-download-component.component';



@NgModule({
  declarations: [ModelDownloadComponent, ModelDownloadComponentComponent],
  imports: [
    CommonModule,
    BaseModule
  ]
})
export class ModelDownloadModule { }
