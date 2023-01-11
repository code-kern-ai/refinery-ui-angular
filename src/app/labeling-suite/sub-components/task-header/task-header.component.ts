import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { LabelingSuiteManager } from '../../helper/manager/manager';
import { LabelingSuiteSettings } from '../../helper/manager/settings';
import { LabelingSuiteComponent } from '../../main-component/labeling-suite.component';

@Component({
  selector: 'kern-labeling-suite-task-header',
  templateUrl: './task-header.component.html',
  styleUrls: ['./task-header.component.scss'],
})
export class LabelingSuiteTaskHeaderComponent implements OnInit, OnDestroy {
  @Input() lsm: LabelingSuiteManager;
  @Input() mainComponent: LabelingSuiteComponent;

  constructor() { }

  ngOnDestroy() { }

  ngOnInit(): void { }
}
