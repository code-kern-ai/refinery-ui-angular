import { Router } from "@angular/router";
import { timer } from "rxjs";
import { ExistingProjectUploadHelper, LookupListsUploadHelper, RecordAddUploadHelper, RecordNewUploadHelper } from "./upload-specific";
import { UploadFileType } from "./upload-types";
import { UploadComponent } from "../upload/upload.component";

export class UploadHelper {
    baseComponent: UploadComponent;
    recordNewUploadHelper: RecordNewUploadHelper;
    recordAddUploadHelper: RecordAddUploadHelper;
    existingProjectUploadHelper: ExistingProjectUploadHelper;
    lookupListsUploadHelper: LookupListsUploadHelper;

    constructor(baseComponent?: UploadComponent, recordNewUploadHelper?: RecordNewUploadHelper, recordAddUploadHelper?: RecordAddUploadHelper, existingProjectUploadHelper?: ExistingProjectUploadHelper, lookupListsUploadHelper?: LookupListsUploadHelper) {
        this.baseComponent = baseComponent;
        this.recordNewUploadHelper = recordNewUploadHelper;
        this.recordAddUploadHelper = recordAddUploadHelper;
        this.existingProjectUploadHelper = existingProjectUploadHelper;
        this.lookupListsUploadHelper = lookupListsUploadHelper;
    }

    upload(file?: File): void {
        if (file) this.baseComponent.file = file;
        switch (this.baseComponent.uploadFileType) {
            case UploadFileType.RECORDS_NEW:
                this.recordNewUploadHelper.doUpload();
                break;
            case UploadFileType.RECORDS_ADD:
                this.recordAddUploadHelper.doUpload();
                break;
            case UploadFileType.PROJECT:
                this.existingProjectUploadHelper.doUpload();
                break;
            case UploadFileType.KNOWLEDGE_BASE:
                this.lookupListsUploadHelper.doUpload();
                break;
        }
    }

    getFinalFileName(projectId: string, uploadFileType: UploadFileType, knowledgeBaseId?: string): string {
        this.baseComponent.projectId = projectId;
        this.baseComponent.reSubscribeToNotifications();
        this.baseComponent.executeOnFinish = () => {
            this.baseComponent.navigateToSettings();
        }
        return this.getFileNameBasedOnType(uploadFileType, this.baseComponent.file?.name, knowledgeBaseId);
    }

    getFileNameBasedOnType(uploadFileType: UploadFileType, fileName: string, knowledgeBaseId?: string): string {
        switch (uploadFileType) {
            case UploadFileType.RECORDS:
                return fileName + "_SCALE";
            case UploadFileType.KNOWLEDGE_BASE:
                return fileName + "_" + knowledgeBaseId;
            default:
                return fileName;
        }
    }

    setProjectId(projectId: string, baseComponent: UploadComponent): void {
        this.baseComponent = baseComponent;
        this.baseComponent.projectId = projectId;
    }

    executeUploadFile(uploadFileType: UploadFileType, baseComponent: UploadComponent): void {
        this.baseComponent = baseComponent;
        this.baseComponent.updateTokenizerAndProjectStatus(this.baseComponent.projectId);
        const finalFileName = this.getFinalFileName(this.baseComponent.projectId, uploadFileType, this.baseComponent.uploadOptions.knowledgeBaseId);
        const importOptions = uploadFileType == UploadFileType.RECORDS ? this.baseComponent.importOptionsHTML.nativeElement.value : '';
        this.baseComponent.finishUpUpload(finalFileName, importOptions);
    }
}