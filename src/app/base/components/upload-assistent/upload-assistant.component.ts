
import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
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
import { UserManager } from 'src/app/util/user-manager';
import { AssistantInputData, AssistantPreset, AssistantSetupData, AssistantStep, getBaseSetupDataForPreset } from './upload-assistant-helper';
import { ModalButtonType } from '../modal/modal-helper';
import { UploadType } from 'src/app/import/components/upload/upload-helper';



@Component({
  selector: 'kern-upload-assistant',
  templateUrl: './upload-assistant.component.html',
  styleUrls: ['./upload-assistant.component.scss'],

})
export class UploadAssistantComponent implements OnInit, OnChanges, OnDestroy {

  @Input() inputData: AssistantInputData;
  //only to be set if the projectId already exists (project add)
  @Input() projectId: string;
  //only one supported atm - at some point it might make sense to have the presets as own components
  @Input() preset: AssistantPreset = AssistantPreset.LABEL_STUDIO;
  @Output() initialUploadTriggered = new EventEmitter<boolean>();

  assistantSetupData: AssistantSetupData;
  canProceed: boolean = false;

  currentStep: AssistantStep = AssistantStep.PREPARATION;
  prepareData = { projectName: null, fileName: null };

  uploadTask: any;
  subscribedProjects: string[] = [];

  get AssistantStepType(): typeof AssistantStep {
    return AssistantStep;
  }

  constructor(
    private projectApolloService: ProjectApolloService,
    private activatedRoute: ActivatedRoute,
    private formBuilder: FormBuilder,
    private s3Service: S3Service,
  ) { }
  ngOnDestroy(): void {
    //global always exists
    NotificationService.unsubscribeFromNotification(this);
    //project specific only if a project exists
    this.subscribedProjects.forEach(projectId => NotificationService.unsubscribeFromNotification(this, projectId));
  }
  ngOnInit(): void {
    this.prepareComponent();
    // UserManager.registerAfterInitActionOrRun(this, () => this.initUsers(), true);
    // this.prepareModule();
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
    console.log(changes)
    this.prepareComponent();
  }

  prepareComponent() {
    // if (!this.projectId) this.projectId = findProjectIdFromRoute(this.activatedRoute);
    if (!this.assistantSetupData) this.assistantSetupData = getBaseSetupDataForPreset(this.preset);
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
      } else if (obj.hasOwnProperty('projectId')) {
        //project - add
        this.prepareData.projectName = obj['project'].name;
      } else {
        console.log("unknown upload object - cannot proceed");
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
      // this.checkDisabled();
      console.log(msgParts, this.inputData.uploadComponent, this.inputData.uploadComponent.projectId, this.inputData.uploadComponent.uploadTask)
      if (msgParts[2] == this.inputData.uploadComponent.uploadTask.id && msgParts[3] == 'state' && msgParts[4] == 'PREPARED') {
        this.inputData.uploadComponent.uploadTaskQuery$.refetch();
        //mapping data
        const t = timer(250).subscribe(() => {
          if (this.inputData.uploadComponent.uploadTask.fileAdditionalInfo) {

            this.uploadTask = this.inputData.uploadComponent.uploadTask;
            this.uploadTask.fileAdditionalInfo = JSON.parse(this.uploadTask.fileAdditionalInfo);
            console.log(this.uploadTask);
            t.unsubscribe();
          }

        })
      }
    }
  }
  private handleGlobalWebsocketNotification(msgParts: string[]) {
    if (msgParts[1] == 'project_created') {
      console.log("handle global", msgParts, this.inputData.uploadComponent, this.inputData.uploadComponent.projectId)
      // this.checkDisabled()
      if (!this.subscribedProjects.includes(msgParts[2])) {
        this.subscribedProjects.push(msgParts[2]);
        this.projectId = msgParts[2]
        NotificationService.subscribeToNotification(this, {
          projectId: msgParts[2],
          whitelist: this.getWhiteListNotificationService(),
          func: this.handleWebsocketNotification
        });
      }
    }
  }


  clickProceed(type: ModalButtonType) {
    if (this.currentStep == AssistantStep.PREPARATION) {
      if (this.preset == AssistantPreset.LABEL_STUDIO) {
        this.prepareLabelStudioImport();
      }

      //this.startUpload();
    } else if (this.currentStep == AssistantStep.SETTINGS) {
      // this.finishUpload();
    } else if (this.currentStep == AssistantStep.RESTRICTIONS) {
      // if(fileWasUploaded)this.currentStep=AssistantStep.SETTINGS;
      // else this.currentStep=AssistantStep.PREPARATION;
    }
  }


  prepareLabelStudioImport() {
    if (this.inputData.uploadFunction.call(this.inputData.uploadFunctionThisObject, UploadType.LABEL_STUDIO)) {
      this.initialUploadTriggered.emit(true);
      // NotificationService.subscribeToNotification(this, {
      //   projectId: this.projectId,
      //   whitelist: this.getWhiteListNotificationService(),
      //   func: this.handleWebsocketNotification
      // });
    }

  }

}
