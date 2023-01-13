import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { getLabelSourceOrder, informationSourceTypeToString, LabelSource, labelSourceToString } from 'src/app/base/enum/graphql-enums';
import { LabelHelper } from 'src/app/projects/components/project-settings/helper/label-helper';
import { dateAsUTCDate, jsonCopy } from 'src/app/util/helper-functions';
import { LabelingSuiteManager, UpdateType } from '../../helper/manager/manager';
import { ComponentType, LabelingSuiteOverviewTableSettings, LabelingSuiteSettings } from '../../helper/manager/settings';
import { getHoverGroupsOverviewTable } from '../../helper/util-functions';
import { LabelingSuiteComponent } from '../../main-component/labeling-suite.component';
import { getEmptyHeuristicInfo, HeuristicInfo, TableDisplayData } from './helper';

@Component({
  selector: 'kern-labeling-suite-overview-table',
  templateUrl: './overview-table.component.html',
  styleUrls: ['./overview-table.component.scss', '../../main-component/labeling-suite.component.scss']
})
export class LabelingSuiteOverviewTableComponent implements OnInit, OnDestroy, OnChanges {

  @Input() lsm: LabelingSuiteManager;

  private fullData: TableDisplayData[];
  dataToDisplay: TableDisplayData[];

  dataHasHeuristics: boolean = false;


  //shorthand not to be used in html
  get settings(): LabelingSuiteOverviewTableSettings {
    return this.lsm.settingManager.settings.overviewTable;
  }
  //copy of settings for html so get methods doesn't need to be run on update but change management takes effect
  htmlSettings: LabelingSuiteOverviewTableSettings;

  constructor(
  ) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.lsm) {
      this.lsm.registerUpdateListenerAndDo(UpdateType.RECORD, this, () => this.prepareDataToDisplay(this.lsm.recordManager.recordData.rlas));
      this.lsm.settingManager.registerSettingListener(ComponentType.OVERVIEW_TABLE, this, () => this.settingsChanged());
    }
  }

  ngOnDestroy() {
    if (this.lsm) {
      this.lsm.unregisterUpdateListener(UpdateType.RECORD, this);
      this.lsm.settingManager.unregisterSettingListener(ComponentType.OVERVIEW_TABLE, this);
    }
  }


  ngOnInit(): void {
  }

  private prepareDataToDisplay(data: any[]) {
    if (!data) return;
    this.buildDisplayArray(data);
    this.settingsChanged();
    this.dataHasHeuristics = this.checkDataHasHeuristics(data);
  }


  private settingsChanged() {
    this.htmlSettings = jsonCopy(this.settings);
    this.rebuildDataToDisplay();
  }

  private rebuildDataToDisplay() {
    if (this.fullData) {
      this.dataToDisplay = this.settings.showHeuristics ? this.fullData : this.fullData.filter(
        (e) => e.sourceTypeKey != LabelSource.INFORMATION_SOURCE
      );
    }
  }

  private buildDisplayArray(data: any[]) {
    if (!data) {
      this.fullData = [];
      return;
    }
    let result = Array(data.length);
    let i = 0;
    for (let e of data) {
      result[i++] = {
        hoverGroups: getHoverGroupsOverviewTable(e),
        orderPos: getLabelSourceOrder(e.sourceType, e.informationSource?.type),
        orderPosSec: this.getOrderPos(e),
        sourceType: this.getSourceTypeText(e),
        sourceTypeKey: e.sourceType,
        taskName: e.labelingTaskLabel.labelingTask.name,
        createdBy: this.getCreatedByName(e),
        label: this.getLabelData(e)
      };
    }
    result.sort((a, b) => a.orderPos - b.orderPos || a.orderPosSec - b.orderPosSec || a.createdBy.localeCompare(b.createdBy));

    this.fullData = result;
  }

  private getOrderPos(e: any): number {
    let pos = e.labelingTaskLabel.labelingTask.attribute?.relativePosition * 1000;
    if (!pos) pos = 100000;
    pos += e.tokenStartIdx;
    return pos;
  }
  private getSourceTypeText(e: any): string {
    if (e.sourceType == LabelSource.INFORMATION_SOURCE) return informationSourceTypeToString(e.informationSource.type, false);
    return labelSourceToString(e.sourceType);

  }


  private getCreatedByName(e: any): string {
    if (e.sourceType == LabelSource.INFORMATION_SOURCE) return e.informationSource.name;
    if (!e.createdBy || e.createdBy == "NULL") return '-';
    else if (!e.user?.firstName) return 'Unknown User ID';
    else {
      return e.user.firstName + ' ' + e.user.lastName;
    }
  }

  private getLabelData(e: any) {
    let value = e.value;
    if (value) value = '(' + value + ')';
    const color = e.labelingTaskLabel.color
    return {
      name: e.labelingTaskLabel.name,
      value: value,
      backgroundColor: 'bg-' + color + '-100',
      textColor: 'text-' + color + '-700',
      borderColor: 'border-' + color + '-400',
    }
  }

  private checkDataHasHeuristics(data: any[]): boolean {
    if (!data) return false;
    for (const el of data) {
      if (el.sourceType == LabelSource.INFORMATION_SOURCE) return true;
    }
    return false;
  }
}
