import {
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { informationSourceTypeToString, LabelSource, labelSourceToString } from 'src/app/base/enum/graphql-enums';
import { LabelHelper } from 'src/app/projects/components/project-settings/helper/label-helper';
import { dateAsUTCDate } from 'src/app/util/helper-functions';
import { getHoverGroups } from '../../helper/util-functions';
import { getEmptyHeuristicInfo, HeuristicInfo, TableDisplayData } from './helper';

@Component({
  selector: 'kern-labeling-suite-overview-table',
  templateUrl: './overview-table.component.html',
  styleUrls: ['./overview-table.component.scss']
})
export class LabelingSuiteOverviewTableComponent implements OnInit, OnDestroy {

  private fullData: TableDisplayData[];
  dataToDisplay: TableDisplayData[];
  heuristicInfo: HeuristicInfo = {
    show: false,
    has: false
  };

  fullyInitialized: boolean = false;


  constructor(
  ) { }


  ngOnDestroy() {
  }


  ngOnInit(): void {
  }


  public setPageSettings(allSettings: any) {
    if (allSettings.overviewTable) {
      this.setHeuristicShow(allSettings.overviewTable.showHeuristics)
    } else {
      console.log("OverviewTable: No showHeuristics property in settings object");
    }
    this.checkFullyInitialized();
  }
  public extendSettingsForSave(allSettings: any) {
    allSettings.overviewTable = {
      showHeuristics: this.heuristicInfo.show
    }
  }

  public prepareDataToDisplay(data: any[]) {
    this.buildDisplayArray(data);
    this.setHeuristicShow(this.heuristicInfo?.show);
    this.heuristicInfo.has = this.checkDataHasHeuristics(data);
    this.checkFullyInitialized();
  }

  public setHeuristicShow(show: boolean) {
    this.heuristicInfo.show = !!show;
    if (this.fullData) {
      this.dataToDisplay = this.heuristicInfo.show ? this.fullData : this.fullData.filter(
        (e) => e.sourceType != LabelSource.INFORMATION_SOURCE
      );
    }
  }

  private buildDisplayArray(data: any[]) {
    if (!data) {
      this.fullData = [];
      return;
    }
    let result = [];

    for (let e of data) {
      const toPush: any = {
        hoverGroups: getHoverGroups(e),
        orderPos: this.getOrderPos(e),
        sourceType: this.getSourceTypeText(e),
        taskName: e.labelingTaskLabel.labelingTask.name,
        createdBy: this.getCreatedByName(e),
        label: this.getLabelData(e)
      };
      result.push(toPush);
    }
    result.sort((a, b) => a.orderPos - b.orderPos);

    this.fullData = result;
    console.log("OverviewTable: Full data set", this.fullData);
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

  // private calcSortOverview(a, b): number {
  //   let aRPos = a.labelingTaskLabel.labelingTask.attribute?.relativePosition;
  //   let bRPos = b.labelingTaskLabel.labelingTask.attribute?.relativePosition;
  //   if (!aRPos) aRPos = Number.MAX_VALUE;
  //   if (!bRPos) bRPos = Number.MAX_VALUE;
  //   return aRPos - bRPos || a.tokenStartIdx - b.tokenStartIdx;
  // }

  private checkDataHasHeuristics(data: any[]): boolean {
    if (!data) return false;
    for (const el of data) {
      if (el.sourceType == LabelSource.INFORMATION_SOURCE) return true;
    }
    return false;
  }
  private checkFullyInitialized() {
    this.fullyInitialized = this.heuristicInfo != null && this.dataToDisplay != null;
  }
}
