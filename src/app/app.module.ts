import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { ErrorHandler, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BaseModule } from './base/base.module';
import { ExceptionInterceptor } from './base/interceptors/exception.interceptor';
import { GlobalErrorHandler } from './base/interceptors/global-exception.interceptor';
import { NotificationService } from './base/services/notification.service';
import { DataModule } from './data/data.module';
import { ProjectsModule } from './projects/projects.module';
import { ImportModule } from './import/import.module';
import { MonitorModule } from './monitor/monitor.module';
import { GraphQLModule } from './graphql.module';
import { ProjectOverviewModule } from './project-overview/project-overview.module';
import { WeakSupervisionModule } from './weak-supervision/weak-supervision.module';
import { ZeroShotModule } from './zero-shot-details/zero-shot-details.module';
import { CrowdLabelerModule } from './weak-supervision/components/crowd-labeler-details/crowd-labeler-details.module';
import { MonacoEditorModule } from 'ngx-monaco-editor';
import { LabelingSuiteModule } from './labeling-suite/labeling-suite.module';
import { KnowledgeBasesModule } from './knowledge-bases/knowledge-bases.module';
import { ConfigModule } from './config/config.module'
import { IntercomModule } from 'ng-intercom';
import { RecordIDEModule } from './record-ide/record-ide.module';
import { ModelDownloadModule } from './model-download/model-download.module';
import { ModelCallbackModule } from './model-callbacks/model-callbacks.module';
import { UsersModule } from './users/users.module';
import { ProjectAdminModule } from './project-admin/project-admin.module';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BaseModule,
    DataModule,
    ProjectsModule,
    UsersModule,
    ImportModule,
    MonitorModule,
    GraphQLModule,
    HttpClientModule,
    ProjectOverviewModule,
    WeakSupervisionModule,
    CrowdLabelerModule,
    ZeroShotModule,
    LabelingSuiteModule,
    RecordIDEModule,
    ModelCallbackModule,
    ModelDownloadModule,
    ProjectAdminModule,
    MonacoEditorModule.forRoot(),
    KnowledgeBasesModule,
    ConfigModule,
    IntercomModule.forRoot({
      appId: 'jwhvb3yv', // from your Intercom config
      updateOnRouterChange: true, // will automatically run `update` on router event changes. Default: `false`
    }),
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: ExceptionInterceptor, multi: true },
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    NotificationService,
  ],
  bootstrap: [AppComponent],
})
export class AppModule { }
