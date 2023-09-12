import { BaseModule } from '../base/base.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EditRecordsComponent } from './components/edit-records.component';
import { ImportModule } from '../import/import.module';


@NgModule({
  declarations: [
    EditRecordsComponent
  ],
  imports: [CommonModule,
    BaseModule,
    ImportModule,
  ]
})
export class EditRecordsModule { }
