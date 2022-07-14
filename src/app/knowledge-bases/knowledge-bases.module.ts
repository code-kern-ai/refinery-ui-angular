import { BaseModule } from './../base/base.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KnowledgeBasesComponent } from './components/knowledge-bases.component';
import { KnowledgeBaseDetailsComponent } from './knowledge-base-details/knowledge-base-details/knowledge-base-details.component';
import { ImportModule } from '../import/import.module';


@NgModule({
  declarations: [
    KnowledgeBasesComponent,
    KnowledgeBaseDetailsComponent
  ],
  imports: [CommonModule,
    BaseModule,
    ImportModule,
  ]
})
export class KnowledgeBasesModule { }
