import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjectsComponent } from './components/projects/projects.component';
import { BaseModule } from '../base/base.module';
import { AppRoutingModule } from '../app-routing.module';
import { ImportModule } from '../import/import.module';
import { ProjectNewComponent } from './components/project-new/project-new.component';
import { ProjectComponent } from './components/project/project.component';
import { ProjectAddComponent } from './components/project-add/project-add.component';
import { CreateNewAttributeComponent } from './components/create-new-attribute/create-new-attribute.component';
import { MonacoEditorModule } from 'ngx-monaco-editor';
import { ProjectSettingsModule } from './components/project-settings/project-settings.module';

@NgModule({
  declarations: [ProjectsComponent, ProjectNewComponent, ProjectComponent, ProjectAddComponent, CreateNewAttributeComponent],
  imports: [
    CommonModule,
    BaseModule,
    AppRoutingModule,
    ImportModule,
    ProjectSettingsModule,
    MonacoEditorModule.forRoot()
  ],
})
export class ProjectsModule { }
