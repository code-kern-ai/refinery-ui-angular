import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { getTaskTypeOrder, LabelingTask } from 'src/app/base/enum/graphql-enums';
import { jsonCopy } from 'src/app/util/helper-functions';
import { LabelingSuiteManager, UpdateType } from '../../helper/manager/manager';
import { ComponentType, LabelingSuiteMainSettings, LabelingSuiteSettings, LabelingSuiteTaskHeaderProjectSettings } from '../../helper/manager/settings';
import { LabelingSuiteComponent } from '../../main-component/labeling-suite.component';
import { getDefaultLabelingVars, LabelingVars, FULL_RECORD_ID } from './helper';
@Component({
  selector: 'kern-labeling-suite-labeling',
  templateUrl: './labeling.component.html',
  styleUrls: ['./labeling.component.scss', '../../main-component/labeling-suite.component.scss'],
})
export class LabelingSuiteLabelingComponent implements OnInit, OnChanges, OnDestroy {

  @Input() lsm: LabelingSuiteManager;

  // shorthand not to be used in html
  get settings(): LabelingSuiteSettings {
    return this.lsm.settingManager.settings;
  }
  //copy of settings for html so get methods doesn't need to be run on update but change management takes effect
  htmlSettings = {
    main: null as LabelingSuiteMainSettings,
    task: null as LabelingSuiteTaskHeaderProjectSettings,
  };

  lVars: LabelingVars = getDefaultLabelingVars();

  constructor() { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.lsm) {
      this.lsm.registerUpdateListenerAndDo(UpdateType.LABELING_TASKS, this, () => this.tasksChanged());
      this.lsm.registerUpdateListenerAndDo(UpdateType.RECORD, this, () => this.recordChanged());
      this.lsm.registerUpdateListenerAndDo(UpdateType.ATTRIBUTES, this, () => this.attributesChanged());
      this.lsm.settingManager.registerSettingListener(ComponentType.TASK_HEADER, this, () => this.settingsChanged(ComponentType.TASK_HEADER));
      this.lsm.settingManager.registerSettingListener(ComponentType.MAIN, this, () => this.settingsChanged(ComponentType.MAIN));
    }
  }
  ngOnDestroy() {
    if (this.lsm) {
      this.lsm.unregisterUpdateListener(UpdateType.LABELING_TASKS, this);
      this.lsm.unregisterUpdateListener(UpdateType.RECORD, this);
      this.lsm.unregisterUpdateListener(UpdateType.ATTRIBUTES, this);
      this.lsm.settingManager.unregisterSettingListener(ComponentType.TASK_HEADER, this);
      this.lsm.settingManager.unregisterSettingListener(ComponentType.MAIN, this);
    }
  }

  ngOnInit(): void { }

  private settingsChanged(componentType: ComponentType) {
    switch (componentType) {
      case ComponentType.MAIN:
        this.htmlSettings.main = jsonCopy(this.settings.main);
        break;
      case ComponentType.TASK_HEADER:
        this.htmlSettings.task = jsonCopy(this.settings.task[this.lsm.projectId]);
        break;
      default:
        break;
    }

  }

  private tasksChanged() {
    if (!this.lsm.taskManager.labelingTasks) return;
    console.log("tasks changed - labeling", this.lsm.taskManager.labelingTasks)
    this.rebuildTaskLookup();
  }

  private recordChanged() {
    console.log("record changed - labeling");
    this.lVars.loading = !(this.lsm.recordManager.recordData.baseRecord && this.lsm.recordManager.recordData.token && this.lsm.recordManager.recordData.rlas);
    this.rebuildTaskLookup();
  }

  private attributesChanged() {
    if (!this.lsm.attributeManager.attributes) return;
    console.log("attributes changed - labeling", this.lsm.attributeManager.attributes)
    this.lVars.loopAttributes = Array(this.lsm.attributeManager.attributes.length + 1);
    let i = 0;
    for (const attribute of this.lsm.attributeManager.attributes) {
      this.lVars.loopAttributes[i++] = attribute;
    }
    this.lVars.loopAttributes[i++] = {
      name: "Full Record",
      id: FULL_RECORD_ID,
      relativePosition: 9999,
    }
    this.rebuildTaskLookup();
  }

  private rebuildTaskLookup() {
    if (!this.lsm.taskManager.labelingTasks || !this.lsm.attributeManager.attributes) return;
    if (!this.lsm.recordManager.recordData.baseRecord || !this.lsm.recordManager.recordData.token || !this.lsm.recordManager.recordData.rlas) return;
    if (!this.lVars.loopAttributes) return;
    this.lVars.taskLookup = {};
    for (const attribute of this.lsm.attributeManager.attributes) {
      this.lVars.taskLookup[attribute.id] = {
        lookup: [],
        attribute: attribute,
      };
    }
    this.lVars.taskLookup[FULL_RECORD_ID] = {
      lookup: [],
      attribute: null,
    };
    for (const task of this.lsm.taskManager.labelingTasks) {
      const attributeKey = task.attribute ? task.attribute.id : FULL_RECORD_ID;
      this.lVars.taskLookup[attributeKey].lookup.push({
        showText: false,
        orderKey: getTaskTypeOrder(task.taskType),
        task: task,
        tokenData: this.getTokenData(attributeKey),
      });
      // if(this.lVars.taskLookup[attributeKey].lookup.length == 1 && task.taskType == LabelingTask.INFORMATION_EXTRACTION){

      // }
    }

    if (this.lVars.taskLookup[FULL_RECORD_ID].lookup.length == 0) {
      delete this.lVars.taskLookup[FULL_RECORD_ID];
      this.lVars.loopAttributes = this.lVars.loopAttributes.filter(a => a.id != FULL_RECORD_ID);
    }
    for (const key in this.lVars.taskLookup) {
      if (this.lVars.taskLookup[key].lookup.length == 0) {
        this.lVars.taskLookup[key].lookup.push({
          showText: true,
          orderKey: 0,
          task: {
            taskType: LabelingTask.NOT_USEABLE,
            name: "No Task",
          }
        });
      } else {
        this.lVars.taskLookup[key].lookup.sort((a, b) => a.orderKey - b.orderKey || a.task.name.localeCompare(b.task.name));
        this.lVars.taskLookup[key].lookup[0].showText = !!this.lVars.taskLookup[key].attribute;
      }
    }

    console.log("rebuild lVars", this.lVars);
  }

  private getTokenData(attributeId: string) {
    if (!this.lsm.recordManager.recordData.token) return null;
    if (attributeId == FULL_RECORD_ID) return null;

    for (const att of this.lsm.recordManager.recordData.token.attributes) {
      if (att.attributeId == attributeId) return att;
    }

    return null;
  }

}
