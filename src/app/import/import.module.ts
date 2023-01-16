import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseModule } from '../base/base.module';
import { UploadRecordsComponent } from './components/upload-records/upload-records.component';
import { UploadComponent } from './components/upload/upload.component';
import { ModalUploadComponent } from './components/modal-upload/modal-upload.component';

@NgModule({
  declarations: [UploadComponent, UploadRecordsComponent, ModalUploadComponent],
  imports: [CommonModule, BaseModule],
  exports: [UploadComponent, UploadRecordsComponent, ModalUploadComponent],
})
export class ImportModule { }
