
import { Component, ElementRef, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { timer } from 'rxjs';
import { distinctUntilChanged, first, pairwise, startWith } from 'rxjs/operators';
import { DownloadState } from 'src/app/import/services/s3.enums';
import { caseType, copyToClipboard, enumToArray, findProjectIdFromRoute, isStringTrue } from 'src/app/util/helper-functions';
import { LabelSource, labelSourceToString } from '../../enum/graphql-enums';
import { NotificationService } from '../../services/notification.service';
import { ProjectApolloService } from '../../services/project/project-apollo.service';
import { ModalButton, ModalButtonType } from '../modal/modal-helper';
import { ExportEnums, ExportFileType, ExportFormat, ExportHelper, ExportPreset, ExportRowType } from './export-helper';



@Component({
  selector: 'kern-export',
  templateUrl: './export.component.html',
  styleUrls: ['./export.component.scss'],

})
export class ExportComponent implements OnInit, OnChanges {
  //if given, export option is enabled
  @Input() sessionId: string;

  static NONE_IN_PROJECT: string = "NONE_IN_PROJECT";
  get DownloadStateType(): typeof DownloadState {
    return DownloadState;
  }
  get ExportEnumsType(): typeof ExportEnums {
    return ExportEnums;
  }

  projectId: string;
  enumArrays: Map<ExportEnums, any[]>;
  formGroups: Map<ExportEnums, FormGroup>;
  downloadState: DownloadState = DownloadState.NONE;
  exportHelper: ExportHelper;

  constructor(
    private projectApolloService: ProjectApolloService,
    private activatedRoute: ActivatedRoute,
    private formBuilder: FormBuilder,
  ) { }
  ngOnInit(): void {

    this.prepareModule();
    NotificationService.subscribeToNotification(this, {
      projectId: this.projectId,
      whitelist: this.getWhiteListNotificationService(),
      func: this.handleWebsocketNotification
    });
  }

  private getWhiteListNotificationService(): string[] {
    let toReturn = [];
    toReturn.push(...['calculate_attribute']);
    toReturn.push(...['labeling_task_deleted', 'labeling_task_created']);
    toReturn.push(...['data_slice_created', 'data_slice_deleted']);
    toReturn.push(...['information_source_created', 'information_source_deleted']);
    return toReturn;
  }
  private handleWebsocketNotification(msgParts: string[]) {
    let somethingToRerequest = false;
    if ('calculate_attribute' == msgParts[1] && ['deleted', 'finished'].includes(msgParts[2])) {
      somethingToRerequest = true;
    } else if (['labeling_task_deleted', 'labeling_task_created', 'data_slice_created', 'data_slice_deleted', 'labeling_task_deleted', 'labeling_task_created'].includes(msgParts[1])) {
      somethingToRerequest = true;
    }
    if (somethingToRerequest) this.fetchSetupData(this.projectId, true);
  }


  ngOnChanges(changes: SimpleChanges): void {
    if (changes.sessionId && Object.keys(changes).length == 1) this.setSessionEnabled();
    else this.prepareModule(true);
  }

  private prepareModule(forceNew: boolean = false) {
    this.exportHelper = new ExportHelper(this);
    if (!this.projectId) this.projectId = findProjectIdFromRoute(this.activatedRoute);
    this.initEnumArrays();
    this.fetchSetupData(this.projectId, forceNew);

  }

  private initEnumArrays() {
    if (this.enumArrays) return;

    this.enumArrays = new Map<ExportEnums, any[]>();
    this.enumArrays.set(ExportEnums.ExportPreset, enumToArray(ExportPreset, { caseType: caseType.CAPITALIZE_FIRST_PER_WORD }));
    this.enumArrays.set(ExportEnums.ExportRowType, enumToArray(ExportRowType, { caseType: caseType.CAPITALIZE_FIRST_PER_WORD }));
    this.enumArrays.set(ExportEnums.ExportFileType, enumToArray(ExportFileType, { caseType: caseType.LOWER }));
    this.enumArrays.set(ExportEnums.ExportFormat, enumToArray(ExportFormat, { caseType: caseType.CAPITALIZE_FIRST_PER_WORD }));
    this.enumArrays.set(ExportEnums.LabelSource, enumToArray(LabelSource, { nameFunction: labelSourceToString }));
  }


  private fetchSetupData(projectId: string, force: boolean = false) {
    if (!projectId) {
      console.log("projectId not set -- shouldn't happen");
      return;
    }
    if (!force && this.enumArrays?.get(ExportEnums.Heuristics)) return;
    this.projectApolloService.getRecordExportFormData(projectId).pipe(first()).subscribe(v => {
      if (v.informationSources.length == 0) v.informationSources.push({ id: ExportComponent.NONE_IN_PROJECT, name: "None in project" });
      if (v.labelingTasks.length == 0) v.labelingTasks.push({ id: ExportComponent.NONE_IN_PROJECT, name: "None in project" });
      if (v.attributes.length == 0) v.attributes.push({ id: ExportComponent.NONE_IN_PROJECT, name: "None in project" });
      if (v.dataSlices.length == 0) v.dataSlices.push({ id: ExportComponent.NONE_IN_PROJECT, name: "None in project" });
      this.enumArrays.set(ExportEnums.Heuristics, v.informationSources);
      this.enumArrays.set(ExportEnums.LabelingTasks, v.labelingTasks);
      this.enumArrays.set(ExportEnums.Attributes, v.attributes);
      this.enumArrays.set(ExportEnums.DataSlices, v.dataSlices);
      this.refreshForms();
    });
  }

  private setPresetValues(preset: ExportPreset) {
    this.setOptionFormDisableState(preset);

    switch (preset) {
      case ExportPreset.CURRENT:
        this.initForms();
        this.setPresetValuesCurrent();
        break;
      case ExportPreset.LABEL_STUDIO:
        this.initForms();
        this.setPresetValuesLabelstudio();
        break;
      case ExportPreset.CUSTOM:
        //nothing else to do
        break;
    }
  }

  private setPresetValuesLabelstudio() {
    this.formGroups.get(ExportEnums.ExportPreset).get(ExportPreset.LABEL_STUDIO).get('active').setValue(true);
    this.formGroups.get(ExportEnums.ExportFormat).get(ExportFormat.LABEL_STUDIO).get('active').setValue(true);
    this.formGroups.get(ExportEnums.LabelSource).get(LabelSource.MANUAL).get('active').setValue(true);
    this.setActiveForAllInGroup(this.formGroups.get(ExportEnums.Attributes), true);
    this.setActiveForAllInGroup(this.formGroups.get(ExportEnums.LabelingTasks), true);

  }
  private setPresetValuesCurrent() {
    this.formGroups.get(ExportEnums.ExportPreset).get(ExportPreset.CURRENT).get('active').setValue(true);
    this.formGroups.get(ExportEnums.ExportFormat).get(ExportFormat.CURRENT).get('active').setValue(true);
    this.formGroups.get(ExportEnums.LabelSource).get(LabelSource.MANUAL).get('active').setValue(true);
    this.formGroups.get(ExportEnums.LabelSource).get(LabelSource.WEAK_SUPERVISION).get('active').setValue(true);
    this.setActiveForAllInGroup(this.formGroups.get(ExportEnums.Attributes), true);
    this.setActiveForAllInGroup(this.formGroups.get(ExportEnums.LabelingTasks), true);
  }

  private setActiveForAllInGroup(group: FormGroup, state: boolean) {
    for (const key in group.controls) {
      const ctrl = group.get(key).get('active');
      if (ctrl.value != state) ctrl.setValue(state);
    }
  }

  private setOptionFormDisableState(type: ExportPreset) {
    if (type == ExportPreset.CURRENT) {
      for (let [key, value] of this.formGroups) {
        if (![ExportEnums.ExportPreset, ExportEnums.ExportFileType, ExportEnums.ExportRowType, ExportEnums.DataSlices].includes(key)) value.disable();
        else value.enable();
      }
    } else if (type == ExportPreset.LABEL_STUDIO) {
      for (let [key, value] of this.formGroups) {
        if ([ExportEnums.ExportFormat, ExportEnums.Attributes].includes(key)) value.disable();
        else value.enable();
      }
    } else if (type == ExportPreset.CUSTOM) {
      for (let [key, value] of this.formGroups) {
        value.enable();
      }
    }
    this.setSessionEnabled();
    this.setNoneInProjectDisable();
  }

  private setNoneInProjectDisable() {
    if (!this.formGroups) return;
    for (let [key, value] of this.formGroups) {
      for (const key in value.controls) {
        //only check first control :)
        const ctrl = value.get(key);
        if (ctrl.get('id').value == ExportComponent.NONE_IN_PROJECT) ctrl.disable();
        break;
      }
    }
  }

  private setSessionEnabled() {
    if (!this.formGroups) return;
    const session = this.formGroups.get(ExportEnums.ExportRowType).get(ExportRowType.SESSION);
    if (!this.sessionId) session.disable();
    else session.enable();
  }

  private initForms() {
    for (let [key, group] of this.formGroups) {
      if (![ExportEnums.ExportRowType, ExportEnums.ExportFileType].includes(key)) this.setActiveForAllInGroup(group, false);
    }
  }

  private isEnumRadioGroup(v: ExportEnums) {
    switch (v) {
      case ExportEnums.ExportPreset:
      case ExportEnums.ExportFileType:
      case ExportEnums.ExportFormat:
      case ExportEnums.ExportRowType:
      case ExportEnums.DataSlices:
        return true;
      default:
        return false;
    }
  }

  private buildForms() {
    if (this.formGroups) return;
    this.formGroups = new Map<ExportEnums, FormGroup>();
    for (let [key, value] of this.enumArrays) {
      const group = this.buildForm(value);
      this.formGroups.set(key, group);
    }
    this.setPresetValues(ExportPreset.CURRENT);

  }
  private refreshForms() {
    if (!this.formGroups) {
      this.buildForms();
      return;
    }
    for (let [key, value] of this.enumArrays) {
      const group = this.formGroups.get(key);
      this.refreshFromGroup(value, group);
    }
    const preset = this.exportHelper.firstActiveInGroup(ExportEnums.ExportPreset, 'value') as ExportPreset;
    this.setOptionFormDisableState(preset);
  }

  logMe(me) {
    console.log(me)
  }

  private refreshFromGroup(arr: any[], group: FormGroup) {
    if (!group) return;
    arr.forEach((v, i) => {
      const ctrlName = v.value ? v.value : v.name;
      if (!group.get(ctrlName)) {
        group.addControl(ctrlName, this.formBuilder.group({
          active: i == 0,
          name: v.name,
          id: v.id,
          value: v.value
        }));
      }
    });
    for (let key in group.controls) {
      if (!arr.find(v => v.name == key || v.value == key)) group.removeControl(key);
    }
  }


  private buildForm(arr: any[]): FormGroup {
    const formGroup = this.formBuilder.group({});
    arr.forEach((v, i) => {
      const ctrlName = v.value ? v.value : v.name;
      formGroup.addControl(ctrlName, this.formBuilder.group({
        active: i == 0,
        name: v.name,
        id: v.id,
        value: v.value
      }));
    })
    return formGroup;
  }

  public flipControlValue(control: AbstractControl, type: ExportEnums) {
    const activeStateCtrl = control.get("active");

    activeStateCtrl.setValue(!activeStateCtrl.value);
    if (type == ExportEnums.ExportPreset && activeStateCtrl.value) {
      this.setPresetValues(control.get("value").value);
    }
    if (this.isEnumRadioGroup(type)) {
      const parent = control.parent;
      for (let [key, value] of Object.entries(parent.controls)) {
        if (value != control) value.get("active").setValue(false);
      }
    }
    if (this.exportHelper?.error.length > 0) {
      this.exportHelper.error = [];
    }
  }

  prepareDownload(type: ModalButtonType) {
    if (type != ModalButtonType.ACCEPT) return;
    const jsonString = this.exportHelper.buildExportData();
    if (this.exportHelper.error.length != 0) return
    this.projectApolloService.prepareRecordExport(this.projectId, jsonString).pipe(first()).subscribe((x) => {
      if (!x) this.exportHelper.error.push("Something went wrong in the backend");
    });

  }

  getLabelStudioTemplate() {
    let tasks, attributes;
    [tasks, attributes] = this.exportHelper.getLabelStudioTemplateExportData();

    if (this.exportHelper.error.length != 0) return
    this.projectApolloService.getLabelstudioTemplate(this.projectId, tasks, attributes).subscribe((res) => {
      console.log(res);
      copyToClipboard(res);
    });
  }



  // requestFileExport(projectId: string): void {
  //   this.downloadState = DownloadState.PREPARATION;
  //   this.projectApolloService.exportRecords(projectId).subscribe((e) => {
  //     this.downloadState = DownloadState.DOWNLOAD;
  //     const downloadContent = JSON.parse(e);
  //     this.downloadText('export.json', downloadContent);
  //     const timerTime = Math.max(2000, e.length * 0.0001);
  //     timer(timerTime).subscribe(
  //       () => (this.downloadState = DownloadState.NONE)
  //     );
  //   });
  // }

  // private downloadText(filename, text) {
  //   if (!text) return;
  //   const element = document.createElement('a');

  //   element.setAttribute(
  //     'href',
  //     'data:text/plain;charset=utf-8,' + encodeURIComponent(text)
  //   );
  //   element.setAttribute('download', filename);

  //   element.style.display = 'none';
  //   document.body.appendChild(element);

  //   element.click();

  //   document.body.removeChild(element);
  // }
}
