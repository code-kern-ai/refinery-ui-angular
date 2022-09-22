import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CrowdLabelerDetailsComponent } from './component/crowd-labeler-details.component';
// import { BaseModule } from '../../../base/base.module';
import { BaseModule } from '../../../base/base.module';



@NgModule({
  declarations: [CrowdLabelerDetailsComponent],
  imports: [
    CommonModule, BaseModule],
})
export class CrowdLabelerModule { }
