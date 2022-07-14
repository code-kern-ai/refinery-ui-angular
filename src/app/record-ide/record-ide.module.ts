import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RecordIDEComponent } from './components/record-ide.component';
import { BaseModule } from '../base/base.module';
import { MonacoEditorModule } from 'ngx-monaco-editor';
import { HIGHLIGHT_OPTIONS } from 'ngx-highlightjs';
import { FormsModule } from '@angular/forms';


@NgModule({
  declarations: [RecordIDEComponent],
  imports: [
    CommonModule,
    BaseModule,
    FormsModule,
    MonacoEditorModule.forRoot(),
  ], providers: [
    {
      provide: HIGHLIGHT_OPTIONS,
      useValue: {
        coreLibraryLoader: () => import('highlight.js/lib/core'),
        languages: {
          python: () => import('highlight.js/lib/languages/python'),
        },
      },
    },
  ],
})
export class RecordIDEModule { }
