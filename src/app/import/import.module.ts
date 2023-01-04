import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseModule } from '../base/base.module';
import { UploadRecordsComponent } from './components/upload-records/upload-records.component';
import { UploadComponent } from './components/upload/upload.component';

@NgModule({
  declarations: [UploadComponent, UploadRecordsComponent],
  imports: [CommonModule, BaseModule],
  exports: [UploadComponent, UploadRecordsComponent],
})
export class ImportModule { }
