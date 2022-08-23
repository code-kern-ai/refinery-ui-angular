import { NotificationCenterComponent } from './notification-center/components/notification-center.component';
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
import { ModelDownloadComponent } from './model-download/components/model-download/model-download.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'projects',
    pathMatch: 'full',
  },
  { path: 'projects', component: ProjectsComponent, data: { name: 'ProjectsComponent' } },
  { path: 'notification-center', component: NotificationCenterComponent, data: { name: 'NotificationCenterComponent' } },
  { path: 'projects/new', component: ProjectNewComponent, data: { name: 'ProjectNewComponent' } },
  { path: 'config', component: ConfigComponent, data: { name: 'ConfigComponent' } },
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
      },
      { path: 'data', component: DataBrowserComponent, data: { name: 'DataBrowserComponent' } },
      { path: 'settings', component: ProjectSettingsComponent, data: { name: 'ProjectSettingsComponent' } },
      { path: 'labeling', component: LabelingComponent, data: { name: 'LabelingComponent' } },
      { path: 'labeling/:sessionId', component: LabelingComponent, data: { name: 'LabelingComponent' } },
      { path: 'record-ide/:sessionId', component: RecordIDEComponent, data: { name: 'RecordIDEComponent' } },
      { path: 'knowledge-base', component: KnowledgeBasesComponent, data: { name: 'KnowledgeBasesComponent' } },
      {
        path: 'knowledge-base/:knowledgeBaseId',
        component: KnowledgeBaseDetailsComponent, data: { name: 'KnowledgeBaseDetailsComponent' }
      },
      { path: 'model-download', component: ModelDownloadComponent, data: { name: 'KnowledgeBasesComponent' } },
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
