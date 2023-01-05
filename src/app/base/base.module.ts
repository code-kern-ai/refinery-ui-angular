import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppRoutingModule } from '../app-routing.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { DragAndDropDirective } from './directives/drag-and-drop.directive';
import { HoverGroupDirective } from './directives/hover-group.directive';
import { NgxFilesizeModule } from 'ngx-filesize';
import { LoadingComponent } from './components/loading/loading.component';
import { HighlightComponent } from './components/highlight/highlight.component';
import { SnakeComponent } from './components/snake/snake.component';
import { ModalComponent } from './components/modal/modal.component';
import { ExportComponent } from './components/export/export.component';
import { LabelStudioAssistantComponent } from './components/upload-assistant/label-studio/label-studio-assistant.component';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { SidebarPmComponent } from './components/sidebar-pm/sidebar-pm.component';
import { DropdownDirective } from './directives/dropdown.directive';
import { PercentRoundPipe } from './pipes/decimal-round.pipe';
import { HeaderComponent } from './components/header/header.component';
import { DropdownComponent } from './components/dropdown/dropdown.component';
import { CommentComponent } from './components/comment/comment.component';
import { BricksIntegratorComponent } from './components/bricks-integrator/bricks-integrator.component';

import { HeuristicStatusesComponent } from './components/heuristic-statuses/heuristic-statuses.component';
import { LogsComponent } from './components/logs/logs.component';
import { DefaultOrderKeyvaluePipe } from './pipes/default-order-key-value.pipe';
import { NotificationCenterComponent } from './components/notification-center/notification-center.component';
import { RecordCardComponent } from './components/record-card/record-card.component';

@NgModule({
  declarations: [
    SidebarPmComponent,
    LoadingComponent,
    HighlightComponent,
    SnakeComponent,
    ModalComponent,
    ExportComponent,
    LabelStudioAssistantComponent,
    DragAndDropDirective,
    HoverGroupDirective,
    DropdownDirective,
    PercentRoundPipe,
    HeaderComponent,
    DropdownComponent,
    CommentComponent,
    BricksIntegratorComponent,
    HeuristicStatusesComponent,
    LogsComponent,
    DefaultOrderKeyvaluePipe,
    NotificationCenterComponent,
    RecordCardComponent
  ],
  imports: [CommonModule, AppRoutingModule],
  exports: [
    AppRoutingModule,
    BrowserAnimationsModule,
    HttpClientModule,
    FormsModule,
    DragAndDropDirective,
    HoverGroupDirective,
    SidebarPmComponent,
    FormsModule,
    ReactiveFormsModule,
    NgxFilesizeModule,
    LoadingComponent,
    HighlightComponent,
    SnakeComponent,
    ModalComponent,
    ExportComponent,
    LabelStudioAssistantComponent,
    InfiniteScrollModule,
    DropdownDirective,
    PercentRoundPipe,
    HeaderComponent,
    DropdownComponent,
    CommentComponent,
    BricksIntegratorComponent,
    HeuristicStatusesComponent,
    LogsComponent,
    DefaultOrderKeyvaluePipe,
    NotificationCenterComponent,
    RecordCardComponent
  ]
})
export class BaseModule { }
