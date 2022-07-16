import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ZeroShotDetailsComponent } from './component/zero-shot-details.component';
import { BaseModule } from './../base/base.module';



@NgModule({
  declarations: [ZeroShotDetailsComponent],
  imports: [
    CommonModule, BaseModule],
})
export class ZeroShotModule { }
