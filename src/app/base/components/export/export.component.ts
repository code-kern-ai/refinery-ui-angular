
import { Component, ElementRef, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { timer } from 'rxjs';
import { distinctUntilChanged, first, pairwise, startWith } from 'rxjs/operators';
import { DownloadState } from 'src/app/import/services/s3.enums';
import { caseType, enumToArray, isStringTrue } from 'src/app/util/helper-functions';
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
  static NONE_IN_PROJECT: string = "NONE_IN_PROJECT";
  get DownloadStateType(): typeof DownloadState {
    return DownloadState;
  }
  get ExportEnumsType(): typeof ExportEnums {
    return ExportEnums;
  }
  //if given, export option is enabled
  @Input() sessionId: string;

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
    if (!this.projectId) this.projectId = this.findProjectIdFromRoute(this.activatedRoute);
    this.initEnumArrays();
    this.fetchSetupData(this.projectId, forceNew);

  }

  private initEnumArrays() {
    if (this.enumArrays) return;

    this.enumArrays = new Map<ExportEnums, any[]>();
    this.enumArrays.set(ExportEnums.ExportPreset, enumToArray(ExportPreset, { caseType: caseType.CAPITALIZE_FIRST }));
    this.enumArrays.set(ExportEnums.ExportRowType, enumToArray(ExportRowType, { caseType: caseType.CAPITALIZE_FIRST }));
    this.enumArrays.set(ExportEnums.ExportFileType, enumToArray(ExportFileType, { caseType: caseType.LOWER }));
    this.enumArrays.set(ExportEnums.ExportFormat, enumToArray(ExportFormat, { caseType: caseType.CAPITALIZE_FIRST }));
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
      this.buildForms(force);
    });
  }

  private setPresetValues(preset: ExportPreset) {
    this.setOptionFormDisableState(preset);

    switch (preset) {
      case ExportPreset.CURRENT:
        this.initForms();
        this.setPresetValuesCurrent();
        break;
      case ExportPreset.LABELSTUDIO:
        this.initForms();
        this.setPresetValuesLabelstudio();
        break;
      case ExportPreset.CUSTOM:
        //nothing else to do
        break;
    }
  }

  private setPresetValuesLabelstudio() {
    this.formGroups.get(ExportEnums.ExportPreset).get("Labelstudio").get('active').setValue(true);
    this.formGroups.get(ExportEnums.ExportFormat).get("Labelstudio").get('active').setValue(true);
    this.formGroups.get(ExportEnums.LabelSource).get("Manual").get('active').setValue(true);
    this.setActiveForAllInGroup(this.formGroups.get(ExportEnums.Attributes), true);
    this.setActiveForAllInGroup(this.formGroups.get(ExportEnums.LabelingTasks), true);

  }
  private setPresetValuesCurrent() {
    this.formGroups.get(ExportEnums.ExportPreset).get("Current").get('active').setValue(true);
    this.formGroups.get(ExportEnums.ExportFormat).get("Current").get('active').setValue(true);
    this.formGroups.get(ExportEnums.LabelSource).get("Manual").get('active').setValue(true);
    this.formGroups.get(ExportEnums.LabelSource).get("Weak Supervision").get('active').setValue(true);
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
    } else if (type == ExportPreset.LABELSTUDIO) {
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
    const session = this.formGroups.get(ExportEnums.ExportRowType).get("Session");
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

  private buildForms(force: boolean = false) {
    if (this.formGroups && !force) return;
    this.formGroups = new Map<ExportEnums, FormGroup>();
    for (let [key, value] of this.enumArrays) {
      const group = this.buildForm(value);
      this.formGroups.set(key, group);
    }
    this.setPresetValues(ExportPreset.CURRENT);

  }

  logMe(me) {
    console.log(me)
  }


  private buildForm(arr: any[]): FormGroup {
    const formGroup = this.formBuilder.group({});
    arr.forEach((v, i) => {
      formGroup.addControl(v.name, this.formBuilder.group({
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

  private findProjectIdFromRoute(route: ActivatedRoute) {
    while (route.parent) {
      route = route.parent;
      if (route.snapshot.params.projectId) {
        return route.snapshot.params.projectId;
      }
    }
  }

  prepareDownload(type: ModalButtonType) {
    if (type != ModalButtonType.ACCEPT) return;
    const jsonString = this.exportHelper.buildExportData();
    if (this.exportHelper.error.length == 0) {
      this.projectApolloService.prepareRecordExport(this.projectId, jsonString).pipe(first()).subscribe((x) => {
        if (!x) this.exportHelper.error.push("Something went wrong in the backend");
      });
    }
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
