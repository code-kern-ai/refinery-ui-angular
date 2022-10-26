
import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { timer } from 'rxjs';
import { first } from 'rxjs/operators';
import { DownloadState } from 'src/app/import/services/s3.enums';
import { S3Service } from 'src/app/import/services/s3.service';
import { caseType, copyToClipboard, enumToArray, findProjectIdFromRoute } from 'src/app/util/helper-functions';
import { LabelSource, labelSourceToString } from '../../enum/graphql-enums';
import { NotificationService } from '../../services/notification.service';
import { ProjectApolloService } from '../../services/project/project-apollo.service';
import { ExportEnums, ExportFileType, ExportFormat, ExportHelper, ExportPreset, ExportRowType } from './export-helper';
import { UserManager } from 'src/app/util/user-manager';



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
  user: any;
  enumArrays: Map<ExportEnums, any[]>;
  formGroups: Map<ExportEnums, FormGroup>;
  downloadState: DownloadState = DownloadState.NONE;
  exportHelper: ExportHelper;
  copyClicked: boolean = false;
  recordExportCredentials: any;

  constructor(
    private projectApolloService: ProjectApolloService,
    private activatedRoute: ActivatedRoute,
    private formBuilder: FormBuilder,
    private s3Service: S3Service,
  ) { }
  ngOnInit(): void {

    UserManager.registerAfterInitActionOrRun(this, () => this.initUsers(), true);
    this.prepareModule();
    NotificationService.subscribeToNotification(this, {
      projectId: this.projectId,
      whitelist: this.getWhiteListNotificationService(),
      func: this.handleWebsocketNotification
    });
  }

  private getWhiteListNotificationService(): string[] {
    let toReturn = ['record_export'];
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
    } else if (msgParts[1] == 'record_export' && this.user?.id == msgParts[2]) {
      this.recordExportCredentials = null;
      this.requestRecordExportCredentials();
    }
    if (somethingToRerequest) this.fetchSetupData(this.projectId, true);
  }

  private initUsers() {
    this.user = UserManager.getUser(false);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.sessionId && Object.keys(changes).length == 1) this.setSessionEnabled();
    else this.prepareModule(true);
  }

  private prepareModule(forceNew: boolean = false) {
    this.exportHelper = new ExportHelper(this);
    if (!this.projectId) {
      this.projectId = findProjectIdFromRoute(this.activatedRoute);
      this.requestRecordExportCredentials();
    }
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
      case ExportPreset.DEFAULT:
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
    this.formGroups.get(ExportEnums.ExportPreset).get(ExportPreset.DEFAULT).get('active').setValue(true);
    this.formGroups.get(ExportEnums.ExportFormat).get(ExportFormat.DEFAULT).get('active').setValue(true);
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
    if (type == ExportPreset.DEFAULT) {
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
    this.setFileTypeEnabled(type);
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

  private setFileTypeEnabled(type: ExportPreset) {
    if (!this.formGroups) return;
    const csv = this.formGroups.get(ExportEnums.ExportFileType).get(ExportFileType.CSV);
    const xlsx = this.formGroups.get(ExportEnums.ExportFileType).get(ExportFileType.XLSX);
    if (type == ExportPreset.LABEL_STUDIO) {
      csv.disable();
      xlsx.disable();
    } else {
      csv.enable();
      xlsx.enable();
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
    this.setPresetValues(ExportPreset.DEFAULT);

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

  public flipControlValue(control: AbstractControl, type: ExportEnums, isCheckBox: boolean) {
    const activeStateCtrl = control.get("active");
    if (isCheckBox || !activeStateCtrl.value) activeStateCtrl.setValue(!activeStateCtrl.value);
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

  prepareDownload() {
    const jsonString = this.exportHelper.buildExportData();
    if (this.exportHelper.error.length != 0) return
    this.projectApolloService.prepareRecordExport(this.projectId, jsonString).pipe(first()).subscribe((x) => {
      if (!x) this.exportHelper.error.push("Something went wrong in the backend");
    });
    this.recordExportCredentials = null;

  }

  getLabelStudioTemplate() {
    let tasks, attributes;
    [tasks, attributes] = this.exportHelper.getLabelStudioTemplateExportData();

    if (this.exportHelper.error.length != 0) return
    this.projectApolloService.getLabelstudioTemplate(this.projectId, tasks, attributes).subscribe((res) => {
      copyToClipboard(res);
      this.copyClicked = true;
      timer(1000).pipe(first()).subscribe(() => this.copyClicked = false);
    });
  }

  requestRecordExportCredentials() {
    this.projectApolloService.getLastRecordExportCredentials(this.projectId).pipe(first()).subscribe((c) => {
      if (!c) this.recordExportCredentials = null;
      else {
        this.recordExportCredentials = JSON.parse(c);
        const parts = this.recordExportCredentials.objectName.split("/");
        //without record_export_
        this.recordExportCredentials.downloadFileName = parts[parts.length - 1].substring(14);
      }
    });
  }

  exportViaFile() {
    if (!this.recordExportCredentials) return;
    this.downloadState = DownloadState.DOWNLOAD;
    const fileName = this.recordExportCredentials.downloadFileName;
    this.s3Service.downloadFile(this.recordExportCredentials, false).subscribe((data) => {
      this.downloadBlob(data, fileName);
      timer(3000).subscribe(
        () => (this.downloadState = DownloadState.NONE)
      );
    });
  }

  private downloadBlob(byteData: any, filename = 'file.zip') {
    const blob = new Blob([byteData], {
      type: "application/octet-stream"
    })
    const blobUrl = URL.createObjectURL(blob);

    // Create a link element
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      })
    );

    document.body.removeChild(link);
  }
}
