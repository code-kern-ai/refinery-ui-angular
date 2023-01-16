import { Router } from "@angular/router";
import { timer } from "rxjs";
import { ExistingProjectUploadHelper, LookupListsUploadHelper, RecordAddUploadHelper, RecordNewUploadHelper } from "./upload-specific";
import { UploadFileType, UploadFileTypeDisplay } from "./upload-types";
import { UploadComponent } from "../upload/upload.component";

export class UploadHelper {
    baseComponent: UploadComponent;
    recordNewUploadHelper: RecordNewUploadHelper;
    recordAddUploadHelper: RecordAddUploadHelper;
    existingProjectUploadHelper: ExistingProjectUploadHelper;
    lookupListsUploadHelper: LookupListsUploadHelper;

    constructor(private router: Router, baseComponent?: UploadComponent, recordNewUploadHelper?: RecordNewUploadHelper, recordAddUploadHelper?: RecordAddUploadHelper, existingProjectUploadHelper?: ExistingProjectUploadHelper, lookupListsUploadHelper?: LookupListsUploadHelper) {
        this.baseComponent = baseComponent;
        this.recordNewUploadHelper = recordNewUploadHelper;
        this.recordAddUploadHelper = recordAddUploadHelper;
        this.existingProjectUploadHelper = existingProjectUploadHelper;
        this.lookupListsUploadHelper = lookupListsUploadHelper;
    }

    upload(file?: File): void {
        if (file) this.baseComponent.file = file;
        console.log(this.baseComponent.uploadFileType)
        switch (this.baseComponent.uploadFileType) {
            case UploadFileType.RECORDS:
                if (this.baseComponent.uploadFileTypeDisplay == UploadFileTypeDisplay.RECORDS_NEW) {
                    this.recordNewUploadHelper.doUpload();
                    return;
                } else if (this.baseComponent.uploadFileTypeDisplay == UploadFileTypeDisplay.RECORDS_ADD) {
                    this.recordAddUploadHelper.doUpload();
                    return;
                }
                break;
            case UploadFileType.PROJECT:
                this.existingProjectUploadHelper.doUpload();
                break;
            case UploadFileType.KNOWLEDGE_BASE:
                this.lookupListsUploadHelper.doUpload();
                break;
        }
    }

    uploadFileToMinio(projectId: string, uploadFileType: UploadFileType, knowledgeBaseId?: string): string {
        this.baseComponent.projectId = projectId;
        this.baseComponent.uploadStarted = true;
        this.baseComponent.reSubscribeToNotifications();
        this.baseComponent.uploadFileType = uploadFileType;
        this.baseComponent.executeOnFinish = () => {
            timer(200).subscribe(() => {
                this.router.navigate(['projects', this.baseComponent.projectId, 'settings'])
            });
        }
        return this.getFinalFileName(this.baseComponent.file?.name, knowledgeBaseId);
    }

    getFinalFileName(fileName: string, knowledgeBaseId?: string): string {
        switch (this.baseComponent.uploadFileType) {
            case UploadFileType.RECORDS:
                return fileName + "_SCALE";
            case UploadFileType.KNOWLEDGE_BASE:
                return fileName + "_" + knowledgeBaseId;
            case UploadFileType.PROJECT:
                return fileName;
        }
    }

    setProjectId(projectId: string, baseComponent: UploadComponent): void {
        this.baseComponent = baseComponent;
        this.baseComponent.projectId = projectId;
    }

    executeUploadForRecords(uploadFileType: UploadFileType, baseComponent: UploadComponent): void {
        this.baseComponent = baseComponent;
        this.baseComponent.updateTokenizerAndProjectStatus(this.baseComponent.projectId);
        const finalFileName = this.uploadFileToMinio(this.baseComponent.projectId, uploadFileType, this.baseComponent.uploadOptions.knowledgeBaseId);
        const importOptions = uploadFileType == UploadFileType.RECORDS ? this.baseComponent.importOptionsHTML.nativeElement.value : '';
        this.baseComponent.finishUpUpload(finalFileName, importOptions);
    }
}