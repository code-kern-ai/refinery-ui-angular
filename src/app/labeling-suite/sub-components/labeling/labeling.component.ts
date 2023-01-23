import { Component, ElementRef, HostListener, Input, OnChanges, OnDestroy, OnInit, QueryList, SimpleChanges, ViewChild, ViewChildren } from '@angular/core';
import { timer } from 'rxjs';
import { getLabelSourceOrder, getTaskTypeOrder, LabelingTask, LabelSource, UserRole } from 'src/app/base/enum/graphql-enums';
import { enumToArray, jsonCopy } from 'src/app/util/helper-functions';
import { LabelingSuiteManager, UpdateType } from '../../helper/manager/manager';
import { LabelingSuiteRlaPreparator } from '../../helper/manager/recordRla';
import { ComponentType, LabelingSuiteLabelingSettings, LabelingSuiteMainSettings, LabelingSuiteSettings, LabelingSuiteTaskHeaderProjectSettings } from '../../helper/manager/settings';
import { GOLD_STAR_USER_ID } from '../../helper/manager/user';
import { LabelingSuiteComponent } from '../../main-component/labeling-suite.component';
import { getDefaultLabelingVars, LabelingVars, FULL_RECORD_ID } from './helper';

const SWIM_LANE_SIZE_PX = 12;
@Component({
  selector: 'kern-labeling-suite-labeling',
  templateUrl: './labeling.component.html',
  styleUrls: ['./labeling.component.scss', '../../main-component/labeling-suite.component.scss'],
})
export class LabelingSuiteLabelingComponent implements OnInit, OnChanges, OnDestroy {

  @Input() lsm: LabelingSuiteManager;
  userRoleEnum: typeof UserRole = UserRole;

  // shorthand not to be used in html
  get settings(): LabelingSuiteSettings {
    return this.lsm.settingManager.settings;
  }
  //copy of settings for html so get methods doesn't need to be run on update but change management takes effect
  htmlSettings = {
    labeling: null as LabelingSuiteLabelingSettings,
    task: null as LabelingSuiteTaskHeaderProjectSettings,
  };

  get rlaPreparator(): LabelingSuiteRlaPreparator {
    return this.lsm.recordManager.rlaPreparator;
  }
  lVars: LabelingVars = getDefaultLabelingVars();

  @ViewChild('labelSelectionBox', { read: ElementRef }) labelSelectionBox: ElementRef;
  @ViewChild('baseDomElement', { read: ElementRef }) baseDomElement: ElementRef;

  //list of active tasks for label selection (multiple for extraction possible)
  activeTasks: any[];
  canEditLabels: boolean = true;
  tokenLookup: {
    [attributeId: string]: {
      token: any[],
      [tokenIdx: number]: {
        rlaArray: {
          orderPos: number,// globalPosition used for absolute positioning
          bottomPos: string,
          isFirst: boolean,
          isLast: boolean,
          hoverGroups: any,
          labelId: string,
          rla: any,
        }[],
        tokenMarginBottom: string,
      }
    }
  }
  labelLookup: any;
  labelAddButtonDisabled: boolean = true;

  labelHotkeys: {
    [hotkey: string]: {
      taskId: string,
      labelId: string
    }
  };


  //list of prepared rla entries
  private fullRlaData: any[];
  //lookup per taskId
  rlaDataToDisplay: {
    [taskId: string]: any
  };


  constructor() { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.lsm) {
      this.settingsChanged(ComponentType.ALL);
      this.lsm.registerUpdateListenerAndDo(UpdateType.LABELING_TASKS, this, () => this.tasksChanged());
      this.lsm.registerUpdateListenerAndDo(UpdateType.RECORD, this, () => this.recordChanged());
      this.lsm.registerUpdateListenerAndDo(UpdateType.ATTRIBUTES, this, () => this.attributesChanged());
      this.lsm.registerUpdateListenerAndDo(UpdateType.DISPLAY_USER, this, () => this.displayUserChanged());
      this.lsm.settingManager.registerSettingListener(ComponentType.TASK_HEADER, this, () => this.settingsChanged(ComponentType.TASK_HEADER));
      this.lsm.settingManager.registerSettingListener(ComponentType.LABELING, this, () => this.settingsChanged(ComponentType.LABELING));
    }
  }
  ngOnDestroy() {
    if (this.lsm) {
      this.lsm.unregisterUpdateListener(UpdateType.LABELING_TASKS, this);
      this.lsm.unregisterUpdateListener(UpdateType.RECORD, this);
      this.lsm.unregisterUpdateListener(UpdateType.ATTRIBUTES, this);
      this.lsm.unregisterUpdateListener(UpdateType.DISPLAY_USER, this);
      this.lsm.settingManager.unregisterSettingListener(ComponentType.TASK_HEADER, this);
      this.lsm.settingManager.unregisterSettingListener(ComponentType.LABELING, this);
    }
  }

  ngOnInit(): void { }

  private displayUserChanged() {
    this.canEditLabels = this.lsm.userManager.canEditManualRlas;
    this.filterRlaDataForCurrent();
  }

  private settingsChanged(componentType: ComponentType) {
    if (componentType == ComponentType.ALL) {
      enumToArray(ComponentType).forEach(ct => ct != ComponentType.ALL ? this.settingsChanged(ct) : null);
      return;
    }
    switch (componentType) {
      case ComponentType.LABELING:
        const displayChanged = this.htmlSettings.labeling?.swimLaneExtractionDisplay != this.settings.labeling.swimLaneExtractionDisplay;
        this.htmlSettings.labeling = jsonCopy(this.settings.labeling);
        if (displayChanged) {
          this.prepareRlaTokenLookup();
        }
        // this.rebuildLabelButtonAmount();
        break;
      case ComponentType.TASK_HEADER:
        const onlyGlobalChanged = this.onlyGlobalSettingsChanged();
        this.htmlSettings.task = jsonCopy(this.settings.task[this.lsm.projectId]);
        if (!onlyGlobalChanged) this.filterRlaDataForCurrent();
        break;
      default:
        break;
    }

  }
  private onlyGlobalSettingsChanged(): boolean {
    return JSON.stringify(this.htmlSettings.task) == JSON.stringify(this.settings.task[this.lsm.projectId]);
  }

  private rebuildLabelLookup() {
    if (!this.lsm.taskManager.labelingTasks) return;
    this.labelLookup = {};
    for (const task of this.lsm.taskManager.labelingTasks) {

      for (const label of task.labels) {
        this.labelLookup[label.id] = {
          label: label,
          visibleInSearch: true,
          task: task,
          color: {
            name: label.color,
            backgroundColor: 'bg-' + label.color + '-100',
            textColor: 'text-' + label.color + '-700',
            borderColor: 'border-' + label.color + '-400',
            hoverColor: 'hover:bg-' + label.color + '-200',
          }
        };
      }
    }
    this.checkLabelVisibleInSearch();
  }

  private checkLabelVisibleInSearch(searchValue?: string, activeTask?: any) {
    if (!this.labelLookup) return;
    for (const labelId in this.labelLookup) {
      const label = this.labelLookup[labelId];
      if (activeTask && label.task.id != activeTask.id) continue;
      if (searchValue) {
        label.visibleInSearch = label.label.name.toLowerCase().includes(searchValue.toLowerCase());
      } else {
        if (label.task.taskType == LabelingTask.INFORMATION_EXTRACTION) {
          label.visibleInSearch = true;
        } else {
          label.visibleInSearch = !label.task.displayLabels.find(x => x.id == labelId);
        }

      }
    }
    this.checkDisableLabelAddButton(searchValue, activeTask);

  }

  private tasksChanged() {
    if (!this.lsm.taskManager.labelingTasks) return;
    this.rebuildLabelLookup();
    this.rebuildTaskLookup();
    this.rebuildHotkeyLookup();
  }

  private rebuildHotkeyLookup() {
    this.labelHotkeys = {};
    for (const task of this.lsm.taskManager.labelingTasks) {
      task.labels.forEach(l => {
        if (l.hotkey) this.labelHotkeys[l.hotkey] = { taskId: task.id, labelId: l.id };
      });
    }
  }

  private recordChanged() {
    this.lVars.loading = !(this.lsm.recordManager.recordData.baseRecord && this.lsm.recordManager.recordData.token && this.lsm.recordManager.rlaPreparator.rlasLoaded());
    this.rebuildTaskLookup();
    this.prepareRlaData();
  }

  private attributesChanged() {
    if (!this.lsm.attributeManager.attributes) return;
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
    if (!this.lsm.recordManager.recordData.baseRecord || !this.lsm.recordManager.recordData.token || !this.lsm.recordManager.rlaPreparator.rlasLoaded()) return;
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
        showGridLabelPart: true,
        tokenData: this.getTokenData(attributeKey),
      });
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
          showGridLabelPart: true,
          task: {
            taskType: LabelingTask.NOT_USEABLE,
            name: "No Task",
          }
        });
      } else {
        this.lVars.taskLookup[key].lookup.sort((a, b) => a.orderKey - b.orderKey || a.task.name.localeCompare(b.task.name));
        this.lVars.taskLookup[key].lookup[0].showText = !!this.lVars.taskLookup[key].attribute;
        if (this.lVars.taskLookup[key].lookup[0].task.taskType == LabelingTask.INFORMATION_EXTRACTION) {
          const extractionTasks = this.lVars.taskLookup[key].lookup.filter(t => t.task.taskType == LabelingTask.INFORMATION_EXTRACTION);
          for (const t of extractionTasks) t.showGridLabelPart = false;

          this.lVars.taskLookup[key].lookup[0].showGridLabelPart = true;
          this.lVars.taskLookup[key].lookup[0].girdRowSpan = "span " + extractionTasks.length;
        }

      }
    }

    if (this.activeTasks) {
      const activeTaskIds = this.activeTasks.map(x => x.task.id);
      for (const key in this.lVars.taskLookup) {
        const found = this.lVars.taskLookup[key].lookup.filter(t => activeTaskIds.includes(t.task.id));
        if (found.length != 0) {
          this.setActiveTasks(found);
          break;
        }
      }
    }
    this.prepareRlaTokenLookup();
  }

  // private rebuildLabelButtonAmount() {
  //   if (!this.lsm.taskManager.labelingTasks) return;
  //   for (const task of this.lsm.taskManager.labelingTasks) {
  //     task.displayLabels = task.labels.slice(0, this.htmlSettings.labeling.showNLabelButton);
  //   }

  // }

  private getTokenData(attributeId: string) {
    if (!this.lsm.recordManager.recordData.token) return null;
    if (attributeId == FULL_RECORD_ID) return null;

    for (const att of this.lsm.recordManager.recordData.token.attributes) {
      if (att.attributeId == attributeId) return att;
    }

    return null;
  }

  setActiveTasks(tasks: any | any[]) {
    if (Array.isArray(tasks)) {
      this.activeTasks = tasks;
    } else {
      this.activeTasks = [tasks];
    }
    this.checkLabelVisibleInSearch();
  }

  labelBoxPosition(labelDomElement: HTMLElement) {
    const labelBox: DOMRect = labelDomElement.getBoundingClientRect();
    const baseBox: DOMRect = this.baseDomElement.nativeElement.getBoundingClientRect();

    this.labelSelectionBox.nativeElement.style.top = (labelBox.top + labelBox.height - baseBox.top + 10) + 'px';
    this.labelSelectionBox.nativeElement.style.left = (labelBox.left - baseBox.left) + 'px';
  }


  private prepareRlaData() {
    // const rlaData = this.lsm.recordManager.recordData.rlas;
    // if (!rlaData) return;

    if (!this.rlaPreparator.rlasLoaded()) return;
    this.fullRlaData = this.rlaPreparator.buildLabelingRlaData();
    // this.settingsChanged();
    // this.dataHasHeuristics = this.rlaManager.rlasHaveHeuristicData();
    this.filterRlaDataForCurrent();


  }

  private filterRlaDataForCurrent() {
    this.rlaDataToDisplay = {};
    if (!this.fullRlaData) return;


    let filtered = this.fullRlaData;
    filtered = this.lsm.userManager.filterRlaDataForUser(filtered, 'rla');
    filtered = this.lsm.settingManager.filterRlaDataForLabeling(filtered, 'rla');

    for (const rla of filtered) {
      if (!this.rlaDataToDisplay[rla.taskId]) this.rlaDataToDisplay[rla.taskId] = [];
      this.rlaDataToDisplay[rla.taskId].push(rla);
    }
    this.prepareRlaTokenLookup();
  }

  //mouse
  @HostListener('window:mousedown', ['$event'])
  onMousedown(event: MouseEvent) {
    if (this.activeTasks) {
      this.activeTasks = null;
    }
  }

  @HostListener('document:keyup', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (event.getModifierState('Control')) return;

    const activeElement = document.activeElement;
    if (activeElement && activeElement instanceof HTMLInputElement && activeElement.type == 'text') return;
    for (const key in this.labelHotkeys) {
      if (key == event.key) {
        console.log("hotkey -> i want to add", key, this.labelHotkeys[key])
        // event.preventDefault();
        // event.stopPropagation();
      }
    }

    // if (!this.labelSearchBlinker || !this.labelSearchBlinker.nativeElement.classList.contains('blink_me')) {
    //   //only blinks when box is "clicked"
    //   this.labelHotkeys.forEach((v, k) => {
    //     if (k == event.key) {
    //       const type = this.labelingTasksMap.get(v.taskId).taskType
    //       if (type == LabelingTask.MULTICLASS_CLASSIFICATION) {
    //         this.addLabelToTask(v.taskId, v.labelId);
    //       } else if (this.isLabelBoxOpen && type == LabelingTask.INFORMATION_EXTRACTION) {
    //         this.addLabelToMarkedText(v.taskId, v.labelId);
    //       }
    //     }
    //   })
    // }

    // if (this.isLabelBoxOpen) {
    //   if (event.key == 'Escape' || event.key == 'Esc') {
    //     this.closeLabelBox();
    //     return;
    //   }
    //   event.preventDefault();
    //   event.stopPropagation();
    //   this.handleFakeInputBox(event);
    //   return;
    // }
    // if (this.isCommentBoxOpen) return;

    // if (event.key == 'ArrowRight') {
    //   this.nextRecord();
    // } else if (event.key == 'ArrowLeft') {
    //   this.previousRecord();
    // }
    // if ('123456789'.includes(event.key)) {
    //   const selectedPos = Number(event.key) - 1;
    //   if (selectedPos < this.userIcons.length) {
    //     this.showUserData(this.userIcons[selectedPos].id);
    //   }
    // }

  }

  @HostListener('document:mouseup', ['$event'])
  onMouseup(event: MouseEvent) {
    if (!this.parseSelectionData()) {
      this.clearSelected();
    }
  }

  private parseSelectionData(): boolean {
    let selection = window.getSelection();
    if (selection.type != 'Range') return false;

    const startElement = this.getSelectionElement(selection, true);
    const endElement = this.getSelectionElement(selection, false);
    if (!startElement || !endElement) return false;
    let attributeIdStart: any = startElement.getAttribute('attributeId');
    let attributeIdEnd: any = endElement.getAttribute('attributeId');

    if (attributeIdStart == null || attributeIdEnd == null || attributeIdStart != attributeIdEnd) return false;
    let tokenStart: any = startElement.getAttribute('tokenIdx');
    let tokenEnd: any = endElement.getAttribute('tokenIdx');
    if (tokenStart == null || tokenEnd == null) return false;
    tokenStart = Number(tokenStart);
    tokenEnd = Number(tokenEnd);
    if (tokenStart > tokenEnd) {
      let tmp = tokenStart;
      tokenStart = tokenEnd;
      tokenEnd = tmp;
    }
    this.clearBrowserSelection();
    this.setSelected(attributeIdStart, tokenStart, tokenEnd, startElement);
    return true;
  }

  private getSelectionElement(selection: Selection, start: boolean, maxSteps: number = 5): HTMLElement {
    let element = start ? selection.anchorNode : selection.focusNode;
    let steps = 0;
    while (steps < maxSteps) {
      if (element instanceof HTMLElement && element.getAttribute('tokenIdx') != null) return element;
      element = element.parentElement;
      steps++;
    }
    return null;
  }

  public setSelected(attributeId: string, tokenStart: number, tokenEnd: number, baseDiv?: HTMLElement) {
    for (const token of this.tokenLookup[attributeId].token) {
      token.selected = token.idx >= tokenStart && token.idx <= tokenEnd;
    }
    this.setActiveTasks(this.lVars.taskLookup[attributeId].lookup);
    this.labelBoxPosition(baseDiv);
  }
  private clearSelected() {
    for (const attributeId in this.tokenLookup) {
      for (const token of this.tokenLookup[attributeId].token) {
        if ('selected' in token) delete token.selected;
      }
    }
  }

  private clearBrowserSelection() {
    window.getSelection().empty();
  }

  public preventDefaultEvent(event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  public addNewLabelToTask(labelName: string, taskId: string) {
    if (this.labelAddButtonDisabled) return;
    this.lsm.taskManager.createLabelInTask(labelName, taskId);
  }
  public addRla(task: any, labelId: string) {
    if (task.taskType == LabelingTask.MULTICLASS_CLASSIFICATION) {
      this.addLabelToTask(task.id, labelId);
    } else {
      this.addLabelToSelection(task.attribute.id, task.id, labelId);
    }
    if (this.htmlSettings.labeling.closeLabelBoxAfterLabel) this.activeTasks = null;
  }

  private addLabelToSelection(attributeId: string, labelingTaskId: string, labelId: string) {
    const selectionData = this.collectSelectionData(attributeId);
    if (!selectionData) return;

    this.lsm.recordManager.addExtractionLabelToRecord(labelingTaskId, labelId, selectionData.startIdx, selectionData.endIdx, selectionData.value);

  }

  private collectSelectionData(attributeId: string): any {
    let startIdx = -1;
    let endIdx = -1;
    for (const token of this.tokenLookup[attributeId].token) {
      if (token.selected) {
        if (startIdx == -1) startIdx = token.idx;
      } else {
        if (startIdx != -1) {
          endIdx = token.idx - 1;
          break;
        }
      }
    }
    if (endIdx == -1) endIdx = this.tokenLookup[attributeId].token.length - 1;
    const tokenData = this.getTokenData(attributeId);
    if (!tokenData) return null;
    const value = tokenData.raw.substring(
      tokenData.token[startIdx].posStart,
      tokenData.token[endIdx].posEnd
    )
    return { startIdx: startIdx, endIdx: endIdx, value: value };
  }


  private addLabelToTask(labelingTaskId: string, labelId: string) {
    if (!this.canEditLabels) return;
    if (!this.fullRlaData) return;

    const existingLabels = this.fullRlaData.filter(e =>
      e.sourceTypeKey == LabelSource.MANUAL && e.createdBy == this.lsm.userManager.displayUserId && e.labelId == labelId);

    if (existingLabels.length == 1) return;
    this.lsm.recordManager.addClassificationLabelToRecord(labelingTaskId, labelId);
  }

  public deleteRecordLabelAssociation(rlaLabel: any) {
    this.lsm.recordManager.deleteLabelFromRecord(rlaLabel.rla.id);
  }


  public checkDisableLabelAddButton(labelName: string, activeTask: any) {
    if (!labelName || !activeTask) this.labelAddButtonDisabled = true;
    else {
      for (const [key, value] of activeTask.labels.entries()) {
        if (value.name.toLowerCase() == labelName) {
          this.labelAddButtonDisabled = true;
          return;
        }
      }
      this.labelAddButtonDisabled = false;

    }

  }



  private prepareRlaTokenLookup() {
    if (!this.lVars.loopAttributes || !this.rlaDataToDisplay || !this.lsm.recordManager.recordData.token) return;
    this.tokenLookup = {};

    const orderLookup = {};
    for (const attribute of this.lVars.loopAttributes) {
      let taskList = this.lVars.taskLookup[attribute.id].lookup;
      taskList = taskList.filter(t => t.task.taskType == LabelingTask.INFORMATION_EXTRACTION);
      if (taskList.length == 0) continue;
      this.tokenLookup[attribute.id] = { token: this.lsm.recordManager.getTokenArrayForAttribute(attribute.id) };
      for (const task of taskList) {
        const rlas = this.rlaDataToDisplay[task.task.id];
        if (!rlas) continue;
        for (const rla of rlas) {
          if (!orderLookup[attribute.id]) orderLookup[attribute.id] = [];
          const orderPos = this.getFirstFitPos(this.tokenLookup[attribute.id], rla.rla.tokenStartIdx, rla.rla.tokenEndIdx);
          orderLookup[attribute.id].push(this.getOrderLookupItem(rla.rla));
          for (let tokenIdx = rla.rla.tokenStartIdx; tokenIdx <= rla.rla.tokenEndIdx; tokenIdx++) {
            if (!this.tokenLookup[attribute.id][tokenIdx]) this.tokenLookup[attribute.id][tokenIdx] = { rlaArray: [], tokenMarginBottom: null };
            this.tokenLookup[attribute.id][tokenIdx].rlaArray.push({
              orderPos: orderPos,
              bottomPos: null,
              isFirst: tokenIdx == rla.rla.tokenStartIdx,
              isLast: tokenIdx == rla.rla.tokenEndIdx,
              hoverGroups: rla.hoverGroups,
              labelId: rla.rla.labelingTaskLabelId,
              rla: rla.rla
            });
          }
        }
      }
    }
    //build order logic
    for (const attributeId in orderLookup) {
      //ensure unique
      orderLookup[attributeId] = [...new Map(orderLookup[attributeId].map(v => [JSON.stringify(v), v])).values()]
      //sort
      orderLookup[attributeId].sort((a, b) => this.getOrderLookupSort(a, b));
      //set position
      let pos = 0;
      for (const item of orderLookup[attributeId]) {
        item.orderPos = ++pos;
      }
    }

    for (const attributeId in this.tokenLookup) {
      for (const tokenIdx in this.tokenLookup[attributeId]) {
        if (tokenIdx == 'token') continue;
        for (const rla of this.tokenLookup[attributeId][tokenIdx].rlaArray) {
          if (rla.orderPos == -1) {
            const orderLookupItem = this.getOrderLookupItem(rla.rla);
            const foundPosItem = orderLookup[attributeId].find(e => this.findOrderPosItem(e, orderLookupItem));
            if (foundPosItem) {
              rla.orderPos = foundPosItem.orderPos;
            }
          }
          rla.bottomPos = ((SWIM_LANE_SIZE_PX * rla.orderPos) * -1) + 'px';
        }
        //order reverse so hover elements work with z index as expected
        this.tokenLookup[attributeId][tokenIdx].rlaArray.sort((a, b) => b.orderPos - a.orderPos);
        const maxPos = Math.max(...this.tokenLookup[attributeId][tokenIdx].rlaArray.map(e => e.orderPos));
        if (maxPos) {
          this.tokenLookup[attributeId][tokenIdx].tokenMarginBottom = (SWIM_LANE_SIZE_PX * maxPos) + 'px';
        }
      }
    }

  }

  private getFirstFitPos(takenPositions: any, start: number, end: number): number {
    if (this.settings.labeling.swimLaneExtractionDisplay) return -1;
    let pos = 1;
    while (!this.checkFit(takenPositions, start, end, pos)) pos++;
    return pos;
  }
  private checkFit(takenPositions: any, start: number, end: number, pos: number): boolean {
    for (let i = start; i <= end; i++) {
      if (takenPositions[i] && takenPositions[i].rlaArray.find(e => e.orderPos == pos)) return false;
    }
    return true;
  }

  private getOrderLookupSort(a: any, b: any): number {
    const aOrder = getLabelSourceOrder(a.sourceType, a.isType);
    const bOrder = getLabelSourceOrder(b.sourceType, b.isType);
    if (aOrder != bOrder) return aOrder - bOrder;

    const order = ["createdBy", "taskName", "labelName"];
    for (const key of order) {
      if (a[key] < b[key]) return -1;
      if (a[key] > b[key]) return 1;
    }
    return 0;
  }

  private findOrderPosItem(orderPosElement: any, compareItem: any): boolean {
    for (const key in compareItem) {
      if (orderPosElement[key] != compareItem[key]) return false;
    }
    return true;
  }

  private getOrderLookupItem(rla: any): any {
    return {
      sourceType: rla.sourceType,
      isType: rla.informationSource?.type,
      createdBy: rla.sourceType == LabelSource.INFORMATION_SOURCE ? rla.informationSource.name : rla.createdBy,
      taskName: rla.labelingTaskLabel.labelingTask.name,
      labelName: rla.labelingTaskLabel.name,
    };
  }

}
