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
import { LabelingSuiteRlaPreparator } from '../../helper/manager/recordRla';
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

  get rlaManager(): LabelingSuiteRlaPreparator {
    return this.lsm.recordManager.rlaPreparator;
  }
  constructor(
  ) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.lsm) {
      this.lsm.registerUpdateListenerAndDo(UpdateType.RECORD, this, () => this.prepareDataForTableDisplay());
      this.lsm.registerUpdateListenerAndDo(UpdateType.DISPLAY_USER, this, () => this.settingsChanged());
      this.lsm.settingManager.registerSettingListener(ComponentType.OVERVIEW_TABLE, this, () => this.settingsChanged());
      this.lsm.settingManager.registerSettingListener(ComponentType.TASK_HEADER, this, () => this.settings.includeLabelDisplaySettings ? this.rebuildDataForDisplay() : null);
    }
  }

  ngOnDestroy() {
    if (this.lsm) {
      this.lsm.unregisterUpdateListener(UpdateType.RECORD, this);
      this.lsm.unregisterUpdateListener(UpdateType.DISPLAY_USER, this);
      this.lsm.settingManager.unregisterSettingListener(ComponentType.OVERVIEW_TABLE, this);
      this.lsm.settingManager.unregisterSettingListener(ComponentType.TASK_HEADER, this);
    }
  }


  ngOnInit(): void {
  }

  private prepareDataForTableDisplay() {
    if (!this.rlaManager.rlasLoaded()) {
      this.dataToDisplay = null;
      return;
    }
    this.fullData = this.rlaManager.buildOverviewTableDisplayArray();
    this.settingsChanged();
    this.dataHasHeuristics = this.rlaManager.rlasHaveHeuristicData();
  }


  private settingsChanged() {
    this.htmlSettings = jsonCopy(this.settings);
    this.rebuildDataForDisplay();
  }

  private rebuildDataForDisplay() {
    if (this.fullData) {
      let filtered = this.fullData;
      filtered = this.lsm.userManager.filterRlaDataForUser(filtered, 'rla');
      filtered = this.lsm.settingManager.filterRlaDataForOverviewTable(filtered, 'rla');
      this.dataToDisplay = filtered;
    } else {
      this.dataToDisplay = null;
    }
  }


}
