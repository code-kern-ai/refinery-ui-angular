import { BaseModule } from '../base/base.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfigComponent } from './components/config.component';


@NgModule({
  declarations: [
    ConfigComponent
  ],
  imports: [CommonModule,
    BaseModule
  ]
})
export class ConfigModule { }
