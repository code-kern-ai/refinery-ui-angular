import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjectAdminComponent } from './component/project-admin.component';
import { BaseModule } from "../base/base.module";



@NgModule({
  declarations: [ProjectAdminComponent],
  imports: [
    CommonModule,
    BaseModule
  ]
})
export class ProjectAdminModule { }
