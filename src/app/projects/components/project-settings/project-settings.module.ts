import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjectSettingsComponent } from './project-settings.component';
import { BaseModule } from 'src/app/base/base.module';
import { AppRoutingModule } from 'src/app/app-routing.module';
import { ImportModule } from 'src/app/import/import.module';
import { DataSchemaComponent } from './components/data-schema/data-schema.component';
import { EmbeddingsComponent } from './components/embeddings/embeddings.component';
import { LabelingTasksComponent } from './components/labeling-tasks/labeling-tasks.component';
import { ProjectMetadataComponent } from './components/project-metadata/project-metadata.component';

@NgModule({
    declarations: [ProjectSettingsComponent, DataSchemaComponent, EmbeddingsComponent, LabelingTasksComponent, ProjectMetadataComponent],
    imports: [
        CommonModule,
        BaseModule,
        AppRoutingModule,
        ImportModule
    ],
})
export class ProjectSettingsModule { }
