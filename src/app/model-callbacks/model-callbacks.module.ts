import { BaseModule } from '../base/base.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModelCallbackComponent } from './components/model-callbacks.component';
import { ImportModule } from '../import/import.module';


@NgModule({
  declarations: [
    ModelCallbackComponent
  ],
  imports: [CommonModule,
    BaseModule,
    ImportModule,
  ]
})
export class ModelCallbackModule { }
