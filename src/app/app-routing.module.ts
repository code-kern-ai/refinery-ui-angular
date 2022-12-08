import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProjectOverviewComponent } from './project-overview/components/project-overview/project-overview.component';
import { ProjectSettingsComponent } from './projects/components/project-settings/project-settings.component';
import { ProjectComponent } from './projects/components/project/project.component';
import { ProjectsComponent } from './projects/components/projects/projects.component';
import { WeakSupervisionComponent } from './weak-supervision/components/weak-supervision/weak-supervision.component';
import { DataBrowserComponent } from './data/components/data-browser/data-browser.component';
import { WeakSourceDetailsComponent } from './weak-supervision/components/weak-source-details/weak-source-details.component';
import { ZeroShotDetailsComponent } from './zero-shot-details/component/zero-shot-details.component';
import { LabelingComponent } from './labeling/components/labeling.component';
import { KnowledgeBasesComponent } from './knowledge-bases/components/knowledge-bases.component';
import { KnowledgeBaseDetailsComponent } from './knowledge-bases/knowledge-base-details/knowledge-base-details/knowledge-base-details.component';
import { ProjectNewComponent } from './projects/components/project-new/project-new.component';
import { ProjectAddComponent } from './projects/components/project-add/project-add.component';
import { RecordIDEComponent } from './record-ide/components/record-ide.component';
import { ConfigComponent } from './config/components/config.component';
import { ModelDownloadComponent } from './model-download/pages/model-download/model-download.component';
import { CreateNewAttributeComponent } from './projects/components/create-new-attribute/create-new-attribute.component';
import { ModelCallbackComponent } from './model-callbacks/components/model-callbacks.component';
import { UsersComponent } from './users/components/users.component';
import { CrowdLabelerDetailsComponent } from './weak-supervision/components/crowd-labeler-details/component/crowd-labeler-details.component';
import { ProjectAdminComponent } from './project-admin/component/project-admin.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'projects',
    pathMatch: 'full',
  },
  { path: 'projects', component: ProjectsComponent, data: { name: 'ProjectsComponent' } },
  { path: 'users', component: UsersComponent, data: { name: 'UsersComponent' } },
  { path: 'projects/new', component: ProjectNewComponent, data: { name: 'ProjectNewComponent' } },
  { path: 'config', component: ConfigComponent, data: { name: 'ConfigComponent' } },
  { path: 'model-download', component: ModelDownloadComponent, data: { name: 'ModelDownloadComponent' } },

  {
    path: 'projects/:projectId',
    component: ProjectComponent,
    data: { name: 'ProjectComponent' },
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full', data: { name: 'None' } },
      { path: 'overview', component: ProjectOverviewComponent, data: { name: 'ProjectOverviewComponent' } },
      { path: 'add', component: ProjectAddComponent, data: { name: 'ProjectAddComponent' } },
      { path: 'heuristics', component: WeakSupervisionComponent, data: { name: 'WeakSupervisionComponent' } },
      {
        path: 'heuristics/:informationSourceId',
        component: WeakSourceDetailsComponent, data: { name: 'WeakSourceDetailsComponent' }
      },
      {
        path: 'zero-shot/:informationSourceId',
        component: ZeroShotDetailsComponent, data: { name: 'ZeroShotDetailsComponent' }
      }, {
        path: 'crowd-labeler/:informationSourceId',
        component: CrowdLabelerDetailsComponent, data: { name: 'CrowdLabelerDetailsComponent' }
      },
      { path: 'data', component: DataBrowserComponent, data: { name: 'DataBrowserComponent' } },
      { path: 'settings', component: ProjectSettingsComponent, data: { name: 'ProjectSettingsComponent' } },
      { path: 'admin', component: ProjectAdminComponent, data: { name: 'ProjectAdminComponent' } },
      { path: 'labeling', component: LabelingComponent, data: { name: 'LabelingComponent' } },
      { path: 'labeling/:id', component: LabelingComponent, data: { name: 'LabelingComponent' } },
      { path: 'record-ide/:id', component: RecordIDEComponent, data: { name: 'RecordIDEComponent' } },
      { path: 'lookup-lists', component: KnowledgeBasesComponent, data: { name: 'KnowledgeBasesComponent' } },
      {
        path: 'lookup-lists/:knowledgeBaseId',
        component: KnowledgeBaseDetailsComponent, data: { name: 'KnowledgeBaseDetailsComponent' }
      },
      { path: 'model-callbacks', component: ModelCallbackComponent, data: { name: 'ModelCallbackComponent' } },
      { path: 'attributes/:attributeId', component: CreateNewAttributeComponent, data: { name: 'CreateNewAttributeComponent' } },
      { path: '**', component: ProjectOverviewComponent, data: { name: 'ProjectOverviewComponent' } },
      //TODO: redirecting to projects overview page and errors
    ],
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule { }
