import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppRoutingModule } from '../app-routing.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { DragAndDropDirective } from './directives/drag-and-drop.directive';
import { HoverGroupDirective } from './directives/hover-group.directive';
import { HighlightModule, HIGHLIGHT_OPTIONS } from 'ngx-highlightjs';
import { NgxFilesizeModule } from 'ngx-filesize';
import { LoadingComponent } from './components/loading/loading.component';
import { SnakeComponent } from './components/snake/snake.component';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { NgxHighlightWordsModule } from 'ngx-highlight-words';
import { SidebarPmComponent } from './components/sidebar-pm/sidebar-pm.component';
import { DropdownDirective } from './directives/dropdown.directive';
import { PercentRoundPipe } from './pipes/decimal-round.pipe';
import { HeaderComponent } from './components/header/header.component';
import { DropdownComponent } from './components/dropdown/dropdown.component';
import { CommentComponent } from './components/comment/comment.component';
import { HeuristicStatusesComponent } from './components/heuristic-statuses/heuristic-statuses.component';
import { LogsComponent } from './components/logs/logs.component';

@NgModule({
  declarations: [
    SidebarPmComponent,
    LoadingComponent,
    SnakeComponent,
    DragAndDropDirective,
    HoverGroupDirective,
    DropdownDirective,
    PercentRoundPipe,
    HeaderComponent,
    DropdownComponent,
    CommentComponent,
    HeuristicStatusesComponent,
    LogsComponent
  ],
  imports: [CommonModule, AppRoutingModule, HighlightModule],
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
    SnakeComponent,
    InfiniteScrollModule,
    HighlightModule,
    NgxHighlightWordsModule,
    DropdownDirective,
    PercentRoundPipe,
    HeaderComponent,
    DropdownComponent,
    CommentComponent,
    HeuristicStatusesComponent,
    LogsComponent
  ],
  providers: [
    {
      provide: HIGHLIGHT_OPTIONS,
      useValue: {
        coreLibraryLoader: () => import('highlight.js/lib/core'),
        languages: {
          python: () => import('highlight.js/lib/languages/python'),
        },
      },
    },
  ],
})
export class BaseModule { }
