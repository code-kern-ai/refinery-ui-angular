import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RecordIDEComponent } from './components/record-ide.component';
import { BaseModule } from '../base/base.module';
import { MonacoEditorModule } from 'ngx-monaco-editor';
import { FormsModule } from '@angular/forms';


@NgModule({
  declarations: [RecordIDEComponent],
  imports: [
    CommonModule,
    BaseModule,
    FormsModule,
    MonacoEditorModule.forRoot(),
  ]
})
export class RecordIDEModule { }
