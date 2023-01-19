import { Component, ElementRef, HostListener, Input, OnInit, QueryList, ViewChildren } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { Subscription, timer } from 'rxjs';
import { distinctUntilChanged, first } from 'rxjs/operators';
import { Project } from 'src/app/base/entities/project';
import { LabelingTask, LabelingTaskTarget, labelingTaskToString } from 'src/app/base/enum/graphql-enums';
import { NotificationService } from 'src/app/base/services/notification.service';
import { ProjectApolloService } from 'src/app/base/services/project/project-apollo.service';
import { Attribute } from '../../entities/attribute.type';
import { DataHandlerHelper } from '../../helper/data-handler-helper';
import { LabelHelper } from '../../helper/label-helper';
import { SettingModals } from '../../helper/modal-helper';

@Component({
  selector: 'kern-labeling-tasks',
  templateUrl: './labeling-tasks.component.html',
  styleUrls: ['./labeling-tasks.component.scss']
})
export class LabelingTasksComponent implements OnInit {

  @Input() project: Project;
  @Input() settingModals: SettingModals;
  @Input() dataHandlerHelper: DataHandlerHelper;
  @Input() attributesArrayUsableUploaded: { id: string, name: string }[];
  @Input() attributes: Attribute[];
  @Input() lh: LabelHelper;

  @ViewChildren('inputTaskName') inputTaskName: QueryList<ElementRef>;
  labelingTasksQuery$: any;
  isTaskNameUnique: boolean = true;
  requestTimeOut: boolean = false;
  subscriptions$: Subscription[] = [];
  labelingTasksDropdownArray: { name: string, value: string }[] = [];

  labelingTasksSchema = this.formBuilder.group({
    labelingTasks: this.formBuilder.array([]),
  });

  get labelingTasksArray() {
    return this.labelingTasksSchema.get('labelingTasks') as FormArray;
  }

  get LabelingTaskType(): typeof LabelingTask {
    return LabelingTask;
  }

  constructor(private formBuilder: FormBuilder, private projectApolloService: ProjectApolloService) {
  }

  ngOnInit(): void {
    this.prepareLabelingTasksRequest(this.project.id);
    NotificationService.subscribeToNotification(this, {
      projectId: this.project.id,
      whitelist: ['label_created', 'label_deleted', 'labeling_task_deleted', 'labeling_task_updated', 'labeling_task_created'],
      func: this.handleWebsocketNotification
    });
  }

  ngAfterViewInit() {
    this.inputTaskName.changes.subscribe(() => {
      this.setFocus(this.inputTaskName);
    });
  }

  private setFocus(focusArea) {
    if (focusArea.length > 0) {
      focusArea.first.nativeElement.focus();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions$.forEach((subscription) => subscription.unsubscribe());
    NotificationService.unsubscribeFromNotification(this, this.project.id);
  }

  prepareLabelingTasksRequest(projectId: string) {
    let labelingTasks$;
    [this.labelingTasksQuery$, labelingTasks$] = this.projectApolloService.getLabelingTasksByProjectId(projectId);
    this.subscriptions$.push(labelingTasks$.subscribe((tasks) => {
      tasks.sort((a, b) => a.relativePosition - b.relativePosition || a.name.localeCompare(b.name))

      if (this.onlyLabelsChanged(tasks)) {
        this.lh.setLabelMap(tasks);
      } else {
        this.labelingTasksArray.clear();
        tasks.forEach((task) => {
          task.labels.sort((a, b) => a.name.localeCompare(b.name));
          this.lh.labelingTaskColors.set(task.id, task.labels.map((label) => label.color));
          task.labels = task.labels.map((label) => this.lh.extendLabelForColor({ ...label }));
          let group = this.formBuilder.group({
            id: task.id,
            name: task.name,
            nameOpen: false,
            targetId: task.taskTarget == LabelingTaskTarget.ON_ATTRIBUTE ? task.attribute.id : "",
            targetName: task.taskTarget == LabelingTaskTarget.ON_ATTRIBUTE ? task.attribute.name : "Full Record",
            taskType: task.taskType,
          })
          this.lh.labelMap.set(task.id, task.labels);
          group.valueChanges.pipe(distinctUntilChanged()).subscribe(() => {
            let values = group.getRawValue(); //to ensure disabled will be returned as well
            if (values.nameOpen || !this.isTaskNameUniqueCheck(values.name, group) || values.name.trim() == "") return;
            this.projectApolloService.
              updateLabelingTask(this.project.id, values.id, values.name, values.taskType, values.targetId == "" ? null : values.targetId).pipe(first()).subscribe();
          });
          this.labelingTasksArray.push(group);
        });
      }

    }));
    return labelingTasks$;
  }

  addLabelingTaskModal() {
    this.settingModals.labelingTask.create.open = true;
    this.dataHandlerHelper.focusModalInputBox('labelingTaskName');
  }

  labelingTasksDropdownValues() {
    if (this.labelingTasksDropdownArray.length == 0) {
      for (let t of Object.values(LabelingTask)) {
        if (t == LabelingTask.NOT_USEABLE) continue;
        this.labelingTasksDropdownArray.push({
          name: labelingTaskToString(t),
          value: t,
        });
      }
    }
    return this.labelingTasksDropdownArray;
  }

  deleteLabelingTask() {
    this.projectApolloService
      .deleteLabelingTask(this.project.id, this.settingModals.labelingTask.delete.taskId).pipe(first())
      .subscribe((x) => this.removeOverviewLocalStorageValues());
  }

  openTaskName(task: FormGroup) {
    task.get("nameOpen").setValue(true);
  }

  checkTaskNameColor(target: HTMLInputElement) {
    if (this.isTaskNameUniqueCheck(target.value)) {
      target.style.color = null;
      target.style.fontWeight = null;
    } else {
      target.style.color = 'red';
      target.style.fontWeight = 'bold';
    }

  }

  changeTaskName(task: FormGroup, value: string) {
    task.get("nameOpen").setValue(false);
    if (value.trim() == "") return;
    if (!this.isTaskNameUniqueCheck(value)) return;
    const taskTarget = task.get("targetId").value == "" ? null : task.get("targetId").value;
    this.projectApolloService.updateLabelingTask(this.project.id, task.get("id").value, value, task.get("taskType").value, taskTarget)
      .pipe(first()).subscribe((r: any) => {
        if (r.data?.updateLabelingTask?.ok) {
          task.get("name").setValue(value);
        }
      });
  }

  isLabelingTaskOptionDisabled(task: AbstractControl, dropdownValue: string) {
    const targetID = task.get('targetId').value;
    if (
      targetID != '' &&
      dropdownValue == LabelingTask.INFORMATION_EXTRACTION
    ) {
      if (this.attributeAlreadyHasInformationExtraction(targetID)) return true;
      else if (this.dataHandlerHelper.getAttributeArrayAttribute(targetID, 'dataType', this.attributes) != 'TEXT')
        return true;
    } else if (
      targetID == '' &&
      dropdownValue == LabelingTask.INFORMATION_EXTRACTION
    )
      return true;
    return false;
  }

  isTaskNameUniqueCheck(name: string, ownGroup: FormGroup = null): boolean {
    if (name == '') return true;
    const nameToExclude = ownGroup ? ownGroup.get("name").value : "";
    let taskName;
    for (let task of this.labelingTasksArray.controls) {
      taskName = task.get('name').value;
      if (name == taskName && taskName != nameToExclude) return false;
    }
    return true;
  }

  isLabelNameUnique(taskId: string, name: string): boolean {
    return this.lh.isLabelNameUnique(taskId, name);
  }

  setLabelingTaskTarget(id: string) {
    this.settingModals.labelingTask.create.taskId = id;
  }

  checkLabelingTaskName(eventTarget: HTMLInputElement) {
    this.isTaskNameUnique = this.isTaskNameUniqueCheck(eventTarget.value);
    this.settingModals.labelingTask.create.name = eventTarget.value;
  }

  attributeAlreadyHasInformationExtraction(attributeId: string): boolean {
    for (let task of this.labelingTasksArray.controls) {
      if (attributeId == task.get('targetId').value) {
        if (task.get('taskType').value == LabelingTask.INFORMATION_EXTRACTION)
          return true;
      }
    }
    return false;
  }

  checkAndModifyLabelName(eventTarget: HTMLInputElement) {
    eventTarget.value = eventTarget.value.replace("-", " ");
    this.settingModals.label.create.labelName = eventTarget;
  }

  onlyLabelsChanged(tasks: any): boolean {
    if (this.labelingTasksArray.controls.length == 0) return false;
    if (this.labelingTasksArray.controls.length != tasks.length) return false;
    for (const task of tasks) {
      if (this.getTaskArrayAttribute(task.id, 'id') == 'UNKNOWN') return false;
      if (this.getTaskArrayAttribute(task.id, 'taskType') != task.taskType)
        return false;
      if (this.getTaskArrayAttribute(task.id, 'name') != task.name)
        return false;
    }

    return true;
  }

  getTaskArrayAttribute(taskId: string, valueID: string) {
    for (let task of this.labelingTasksArray.controls) {
      if (taskId == task.get('id').value) return task.get(valueID).value;
    }
    return 'UNKNOWN';
  }

  removeLabel() {
    const labelDeleteData = this.settingModals.label.delete;
    this.lh.removeLabel(this.project.id, labelDeleteData.taskId, labelDeleteData.label.id, labelDeleteData.label.color);
  }

  addLabel(): void {
    this.requestTimeOut = this.lh.addLabel(this.project.id, this.settingModals.label.create.taskId, this.settingModals.label.create.labelName, this.requestTimeOut);
  }

  addLabelingTask() {
    const labelingTask = this.settingModals.labelingTask.create;
    if (this.requestTimeOut) return;
    if (labelingTask.name.trim().length == 0) return;
    if (!this.isTaskNameUniqueCheck(labelingTask.name)) return;
    if (labelingTask.taskId == "@@NO_ATTRIBUTE@@") labelingTask.taskId = null;
    let labelingTaskType = LabelingTask.MULTICLASS_CLASSIFICATION;
    if (
      labelingTask.taskId &&
      this.dataHandlerHelper.getAttributeArrayAttribute(labelingTask.taskId, 'dataType', this.attributes) == 'TEXT'
    )
      labelingTaskType = LabelingTask.NOT_SET;

    this.projectApolloService.addLabelingTask(this.project.id, labelingTask.name.trim(), labelingTaskType, labelingTask.taskId)
      .pipe(first()).subscribe(() => {
        this.settingModals.labelingTask.create.name = '';
      });

    this.requestTimeOut = true;
    timer(100).subscribe(() => this.requestTimeOut = false);
    this.settingModals.labelingTask.create.open = false;
  }

  removeOverviewLocalStorageValues() {
    let currentData = JSON.parse(localStorage.getItem("projectOverviewData"));
    if (!currentData || !currentData[this.project.id]) return;
    delete currentData[this.project.id];
    localStorage.setItem('projectOverviewData', JSON.stringify(currentData));
  }

  updateLabelColor(projectId: string, labelingTaskId: string, labelId: string, oldLabelColor: string, newLabelColor: string) {
    this.lh.updateLabelColor(projectId, labelingTaskId, labelId, oldLabelColor, newLabelColor);
  }

  checkAndSetLabelHotkey(event: KeyboardEvent) {
    this.lh.checkAndSetLabelHotkey(event);
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (!this.lh.modalOpen.changeColor) return;
    this.checkAndSetLabelHotkey(event);
  }

  handleWebsocketNotification(msgParts) {
    if (['label_created', 'label_deleted', 'labeling_task_deleted', 'labeling_task_updated', 'labeling_task_created'].includes(msgParts[1])) {
      this.labelingTasksQuery$.refetch();
    }
  }

  addLabelModal() {
    this.dataHandlerHelper.focusModalInputBox('labelName');
  }
}
