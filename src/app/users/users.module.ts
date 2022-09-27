import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UsersComponent } from './components/users.component';
import { BaseModule } from '../base/base.module';
import { AppRoutingModule } from '../app-routing.module';
import { ImportModule } from '../import/import.module';

@NgModule({
  declarations: [UsersComponent],
  imports: [
    CommonModule,
    BaseModule,
    AppRoutingModule,
    ImportModule,
  ],
})
export class UsersModule { }
