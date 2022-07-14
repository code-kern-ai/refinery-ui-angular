import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationCenterComponent } from './components/notification-center.component';
import { BaseModule } from 'src/app/base/base.module';



@NgModule({
  declarations: [
    NotificationCenterComponent
  ],
  imports: [
    CommonModule,
    BaseModule
  ]
})
export class NotificationCenterModule { }
