
import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { timer } from 'rxjs';
import { first } from 'rxjs/operators';
import { DownloadState } from 'src/app/import/services/s3.enums';
import { S3Service } from 'src/app/import/services/s3.service';
import { caseType, copyToClipboard, enumToArray, findProjectIdFromRoute } from 'src/app/util/helper-functions';
import { LabelSource, labelSourceToString } from '../../../enum/graphql-enums';
import { NotificationService } from '../../../services/notification.service';
import { ProjectApolloService } from '../../../services/project/project-apollo.service';
import { UserManager } from 'src/app/util/user-manager';
import { AssistantConstants, AssistantInputData, AssistantSetupData, AssistantStep, LabelStudioTaskMapping, PreparationStep } from './label-studio-assistant-helper';
import { ModalButtonType } from '../../modal/modal-helper';
import { UploadType } from 'src/app/import/components/upload/upload-helper';



@Component({
  selector: 'kern-label-studio-assistant',
  templateUrl: './label-studio-assistant.component.html',
  styleUrls: ['./label-studio-assistant.component.scss'],

})
export class LabelStudioAssistantComponent implements OnInit, OnChanges, OnDestroy {

  @Input() inputData: AssistantInputData;
  //only to be set if the projectId already exists (project add)
  @Input() projectId: string;
  //only one supported atm - at some point it might make sense to have the presets as own components
  @Output() initialUploadTriggered = new EventEmitter<boolean>();

  assistantSetupData: AssistantSetupData;
  canProceed: boolean = false;

  prepareData = { projectName: null, fileName: null };

  uploadTask: any;

  subscribedProjects: string[] = [];

  userOptions: any[];
  taskOptions: any[];
  mappings = {
    users: {},
    tasks: {},
    prioritizeExisting: true
  }

  states = {
    preparation: PreparationStep.INITIAL,
    tab: AssistantStep.PREPARATION
  }

  public projectCreated: boolean = false;


  get AssistantStepType(): typeof AssistantStep {
    return AssistantStep;
  }
  get PreparationStepType(): typeof PreparationStep {
    return PreparationStep;
  }

  constructor(
    private projectApolloService: ProjectApolloService,
  ) { }
  ngOnDestroy(): void {
    //global always exists
    NotificationService.unsubscribeFromNotification(this);
    //project specific only if a project exists
    this.subscribedProjects.forEach(projectId => NotificationService.unsubscribeFromNotification(this, projectId));
  }
  ngOnInit(): void {
    this.prepareComponent();
    UserManager.registerAfterInitActionOrRun(this, () => this.userOptions = this.prepareUserForDropdown(UserManager.getAllUsers()), true);
    NotificationService.subscribeToNotification(this, {
      whitelist: ['project_created'],
      func: this.handleGlobalWebsocketNotification
    });
  }

  private getWhiteListNotificationService(): string[] {
    let toReturn = ['file_upload'];
    return toReturn;
  }


  ngOnChanges(changes: SimpleChanges): void {
    this.prepareComponent();
    if (changes.projectId) {
      if (changes.projectId.currentValue != changes.projectId.previousValue) {
        //project - add collects the project id from route and sets it in onInit
        this.subscribeToProjectNotifications(this.projectId);
      }
    }
  }
  prepareUserForDropdown(users: any[]) {
    const returnValues = [{ name: AssistantConstants.UNKNOWN_VALUE, key: AssistantConstants.UNKNOWN_KEY, }, { name: AssistantConstants.IGNORE_VALUE, key: AssistantConstants.IGNORE_KEY, }];
    returnValues.push(...users.map(user => {
      return { name: user.mail, key: user.id };
    }));
    return returnValues;
  }
  prepareComponent() {
    if (!this.taskOptions) this.taskOptions = enumToArray(LabelStudioTaskMapping, { caseType: caseType.CAPITALIZE_FIRST })
    this.checkCanProceed();
  }

  checkCanProceed() {
    this.canProceed = true;
    if (!this.inputData) this.canProceed = false;
    else {
      if (this.inputData.uploadComponent.file) this.prepareData.fileName = this.inputData.uploadComponent.file.name;
      const obj = this.inputData.uploadFunctionThisObject;
      if (obj.hasOwnProperty('createNewProject')) {
        //project - new
        this.prepareData.projectName = obj['createNewProject'].get('projectTitle').value;
      } else if (obj.hasOwnProperty('projectId') && obj['project']) {
        //project - add
        this.prepareData.projectName = obj['project'].name;
      }
      this.canProceed = this.canProceed && !!this.prepareData.projectName && !!this.prepareData.fileName;
    }
  }

  logMe(me) {
    console.log(me)
  }

  private handleWebsocketNotification(msgParts: string[]) {
    this.projectId = msgParts[0];
    if (msgParts[1] == 'file_upload') {
      if (msgParts[2] == this.inputData.uploadComponent.uploadTask.id && msgParts[3] == 'state' && msgParts[4] == 'PREPARED') {
        this.inputData.uploadComponent.uploadTaskQuery$.refetch();
        const t = timer(250).subscribe(() => {
          if (this.checkAndPrepareDataAvailable()) t.unsubscribe();
        })
      }
    }
  }
  private handleGlobalWebsocketNotification(msgParts: string[]) {
    if (msgParts[1] == 'project_created') {
      if (this.subscribeToProjectNotifications(msgParts[2])) {
        this.projectCreated = true;
      }
    }
  }
  private subscribeToProjectNotifications(projectId: string): boolean {
    if (!this.subscribedProjects.includes(projectId)) {

      this.subscribedProjects.push(projectId);
      this.projectId = projectId;
      NotificationService.subscribeToNotification(this, {
        projectId: projectId,
        whitelist: this.getWhiteListNotificationService(),
        func: this.handleWebsocketNotification
      });
      return true;
    }
    return false;
  }
  private checkAndPrepareDataAvailable(): boolean {
    if (this.inputData.uploadComponent.uploadTask.fileAdditionalInfo) {

      this.uploadTask = this.inputData.uploadComponent.uploadTask;
      this.mappings.users = Object.assign({}, ...this.uploadTask.fileAdditionalInfo.user_ids.map((u) => ({ [u]: this.userOptions[0] })));
      this.mappings.tasks = Object.assign({}, ...this.uploadTask.fileAdditionalInfo.tasks.map((t) => ({ [t]: this.taskOptions[0] })));
      this.states.preparation = PreparationStep.FILE_PREPARED;
      return true;
    }
    return false
  }


  clickProceed(type: ModalButtonType) {
    if (type != ModalButtonType.ACCEPT) return;
    if (this.states.preparation == PreparationStep.FILE_IN_PREPARATION) return;
    if (this.states.preparation == PreparationStep.INITIAL) {
      this.prepareLabelStudioImport();
      return;
    }
    const projectId = this.inputData.uploadComponent.projectId;
    const uploadTaskId = this.uploadTask.id;
    const mappings = {
      users: Object.assign({}, ...Object.keys(this.mappings.users).map((u) => ({ [u]: this.mappings.users[u].key }))),
      tasks: Object.assign({}, ...Object.keys(this.mappings.tasks).map((t) => ({ [t]: this.mappings.tasks[t].value }))),
      prioritizeExisting: this.mappings.prioritizeExisting
    }
    if (!projectId || !uploadTaskId || !mappings) return;
    this.projectApolloService.setUploadTaskMappings(projectId, uploadTaskId, JSON.stringify(mappings)).pipe(first())
      .subscribe((x) => this.states.preparation = PreparationStep.MAPPING_TRANSFERRED);

  }


  prepareLabelStudioImport() {
    if (this.inputData.uploadFunction.call(this.inputData.uploadFunctionThisObject, UploadType.LABEL_STUDIO)) {
      this.initialUploadTriggered.emit(true);
      this.states.preparation = PreparationStep.FILE_IN_PREPARATION;
    }

  }

}
