import { Component, ElementRef, HostListener, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { LabelingTask } from 'src/app/base/enum/graphql-enums';
import { jsonCopy } from 'src/app/util/helper-functions';
import { LabelingSuiteManager, UpdateType } from '../../helper/manager/manager';
import { ComponentType, LabelingSuiteSettings, LabelingSuiteTaskHeaderProjectSettings } from '../../helper/manager/settings';
import { getHoverGroupsTaskOverview } from '../../helper/util-functions';
import { LabelingSuiteComponent } from '../../main-component/labeling-suite.component';
import { LabelingSuiteTaskHeaderDisplayData, LabelingSuiteTaskHeaderLabelDisplayData } from './helper';

@Component({
  selector: 'kern-labeling-suite-task-header',
  templateUrl: './task-header.component.html',
  styleUrls: ['./task-header.component.scss', '../../main-component/labeling-suite.component.scss'],
})
export class LabelingSuiteTaskHeaderComponent implements OnInit, OnChanges, OnDestroy {
  @Input() lsm: LabelingSuiteManager;


  //shorthand not to be used in html
  get settings(): LabelingSuiteTaskHeaderProjectSettings {
    return this.lsm.settingManager.settings.task[this.lsm.projectId];
  }
  //copy of settings for html so get methods doesn't need to be run on update but change management takes effect
  htmlSettings: LabelingSuiteTaskHeaderProjectSettings;


  displayData: LabelingSuiteTaskHeaderDisplayData[];


  @ViewChild('labelSettingsBox', { read: ElementRef }) labelSettingsBox: ElementRef;
  labelSettingsLabel: LabelingSuiteTaskHeaderLabelDisplayData;

  constructor() { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.lsm) {
      this.lsm.registerUpdateListenerAndDo(UpdateType.LABELING_TASKS, this, () => {
        this.displayData = this.prepareDataForDisplay(this.lsm.taskManager.labelingTasks)
      });
      this.lsm.settingManager.registerSettingListener(ComponentType.TASK_HEADER, this, () => this.settingsChanged());
    }
  }

  ngOnDestroy() {
    if (this.lsm) {
      this.lsm.unregisterUpdateListener(UpdateType.LABELING_TASKS, this);
      this.lsm.settingManager.unregisterSettingListener(ComponentType.TASK_HEADER, this);
    }
  }


  ngOnInit(): void {
  }


  labelSettingsBoxPosition(labelDomElement: HTMLElement, baseDomElement: HTMLElement) {
    const labelBox: DOMRect = labelDomElement.getBoundingClientRect();
    const baseBox: DOMRect = baseDomElement.getBoundingClientRect();

    this.labelSettingsBox.nativeElement.style.top = (labelBox.top + labelBox.height - baseBox.top + 10) + 'px';
    this.labelSettingsBox.nativeElement.style.left = (labelBox.left - baseBox.left) + 'px';
  }

  setLabelSettingsLabel(label: any) {
    if (label == this.labelSettingsLabel) this.labelSettingsLabel = null;
    else this.labelSettingsLabel = label;

  }

  toggleLabelDisplaySetting(attribute: string) {
    if (!this.labelSettingsLabel) return;
    const labelId = this.labelSettingsLabel.id;
    const taskId = this.labelSettingsLabel.taskId;
    this.settings[taskId][labelId][attribute] = !this.settings[taskId][labelId][attribute];

    this.lsm.settingManager.runSettingListeners(ComponentType.TASK_HEADER);
  }

  toggleIsCollapsed() {
    this.lsm.settingManager.settings.task.isCollapsed = !this.lsm.settingManager.settings.task.isCollapsed;
    // this.htmlSettings.isCollapsed =this.lsm.settingManager.settings.task.isCollapsed; 
    this.lsm.settingManager.saveSettings();
    // no need to run listeners since this is a project independent setting
  }

  setAllLabelDisplaySetting(value: boolean, labelSettingsLabel?: any, attribute?: string, deactivateOthers?: boolean) {
    if (deactivateOthers && !attribute) {
      console.error("deactivateOthers needs attribute");
      return;
    }
    if (labelSettingsLabel) {
      const labelId = this.labelSettingsLabel.id;
      const taskId = this.labelSettingsLabel.taskId;
      if (attribute && !deactivateOthers) this.settings[taskId][labelId][attribute] = value;
      else {
        for (let key in this.settings[taskId][labelId]) {
          if (deactivateOthers) {
            if (key == attribute) {
              this.settings[taskId][labelId][key] = value;
            } else {
              this.settings[taskId][labelId][key] = false;
            }
          } else {
            this.settings[taskId][labelId][key] = value;
          }
        }
      }
    } else {
      for (let taskId in this.settings) {
        for (let labelId in this.settings[taskId]) {
          if (attribute && !deactivateOthers) this.settings[taskId][labelId][attribute] = value;
          else {
            for (let key in this.settings[taskId][labelId]) {
              if (deactivateOthers) {
                if (key == attribute) {
                  this.settings[taskId][labelId][key] = value;
                } else {
                  this.settings[taskId][labelId][key] = false;
                }
              } else {
                this.settings[taskId][labelId][key] = value;
              }
            }
          }
        }
      }
    }
    this.lsm.settingManager.runSettingListeners(ComponentType.TASK_HEADER);
  }


  private prepareDataForDisplay(data: any[]): LabelingSuiteTaskHeaderDisplayData[] {
    if (!data) return null;
    const finalData = Array(data.length);
    let i = 0;
    for (const task of data) {
      let taskSettings = this.settings[task.id];
      if (!taskSettings) {
        taskSettings = {};
        this.settings[task.id] = taskSettings;
      }
      task.labels.sort((a, b) => a.name.localeCompare(b.name));
      const labels = this.setLabelsForDisplay(task);
      let pos = task.taskType == LabelingTask.INFORMATION_EXTRACTION ? 0 : 10000;
      pos += task.attribute ? task.attribute.relativePosition : 0;
      finalData[i++] = {
        id: task.id,
        name: task.name,
        hoverGroups: getHoverGroupsTaskOverview(task.name),
        orderPos: pos,
        settings: taskSettings,
        labels: labels,
        labelOrder: task.labels.map(l => l.id),//labels are sorted by name before
      };

    }

    finalData.sort((a, b) => a.orderPos - b.orderPos || a.name.localeCompare(b.name));
    this.settingsChanged();
    return finalData;
  }

  //labels dict is by reference so it can be filled in method
  private setLabelsForDisplay(task: any) {
    const labels = {};
    const taskSettings = this.settings[task.id];
    for (const label of task.labels) {
      let labelSettings = taskSettings[label.id];
      if (!labelSettings) {
        labelSettings = this.lsm.settingManager.getDefaultTaskOverviewLabelSettings();
        taskSettings[label.id] = labelSettings;
      }
      const data: LabelingSuiteTaskHeaderLabelDisplayData = {
        id: label.id,
        taskId: task.id,
        name: label.name,
        hoverGroups: getHoverGroupsTaskOverview(task.name, label.id),
        hotkey: label.hotkey,
        color: {
          name: label.color,
          backgroundColor: 'bg-' + label.color + '-100',
          textColor: 'text-' + label.color + '-700',
          borderColor: 'border-' + label.color + '-400',
          hoverColor: 'bg-' + label.color + '-200', //here without "hover:" since the css hover effect isn't used
        }
      }
      labels[label.id] = data;
    }
    return labels;
  }


  private settingsChanged() {
    this.htmlSettings = jsonCopy(this.settings);
  }

  //mouse
  @HostListener('window:mouseup', ['$event'])
  onMouseup(event: MouseEvent) {
    if (this.labelSettingsLabel && !this.lsm.modalManager.modals.taskHeaderInfo.open) {
      this.labelSettingsLabel = null;
    }
  }

  public preventDefaultEvent(event: MouseEvent) {
    event.stopPropagation();

    event.preventDefault();
    event.stopImmediatePropagation();
  }


}
