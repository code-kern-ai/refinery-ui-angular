import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WeakSupervisionComponent } from './components/weak-supervision/weak-supervision.component';
import { BaseModule } from '../base/base.module';
import { WeakSourceDetailsComponent } from './components/weak-source-details/weak-source-details.component';
import { HIGHLIGHT_OPTIONS } from 'ngx-highlightjs';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MonacoEditorModule } from 'ngx-monaco-editor';

@NgModule({
  declarations: [WeakSupervisionComponent, WeakSourceDetailsComponent],
  imports: [CommonModule,
    BaseModule,
    FormsModule,
    ReactiveFormsModule,
    MonacoEditorModule.forRoot()],
  providers: [
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
export class WeakSupervisionModule { }
