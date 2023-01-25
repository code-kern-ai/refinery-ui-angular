import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseModule } from '../base/base.module';
import { UploadComponent } from './components/upload/upload.component';
import { ModalUploadComponent } from './components/modal-upload/modal-upload.component';

@NgModule({
  declarations: [UploadComponent, ModalUploadComponent],
  imports: [CommonModule, BaseModule],
  exports: [UploadComponent, ModalUploadComponent],
})
export class ImportModule { }
