import { Router } from "@angular/router";
import { timer } from "rxjs";
import { RecordAddUploadHelper, RecordNewUploadHelper } from "./upload-specific";
import { UploadFileType, UploadFileTypeDisplay } from "./upload-types";
import { UploadComponent } from "./upload.component";

export class UploadHelper {
    baseComponent: UploadComponent;
    recordNewUploadHelper: RecordNewUploadHelper;
    recordAddUploadHelper: RecordAddUploadHelper;

    constructor(private router: Router, baseComponent?: UploadComponent, recordNewUploadHelper?: RecordNewUploadHelper, recordAddUploadHelper?: RecordAddUploadHelper) {
        this.baseComponent = baseComponent;
        this.recordNewUploadHelper = recordNewUploadHelper;
        this.recordAddUploadHelper = recordAddUploadHelper;
    }

    upload(): void {
        switch (this.baseComponent.uploadFileTypeDisplay) {
            case UploadFileTypeDisplay.RECORDS_NEW:
                this.recordNewUploadHelper.doUpload();
                break;
            case UploadFileTypeDisplay.RECORDS_ADD:
                this.recordAddUploadHelper.doUpload();
                break;

        }
    }

    uploadFileToMinio(projectId: string, uploadFileType: UploadFileType, knowledgeBaseId?: string): string {
        this.baseComponent.projectId = projectId;
        this.baseComponent.uploadOptions.reloadOnFinish = UploadFileType.RECORDS || uploadFileType == UploadFileType.KNOWLEDGE_BASE ? false : true;
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
            default:
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
        const finalFileName = this.uploadFileToMinio(this.baseComponent.projectId, uploadFileType);
        this.baseComponent.finishUpUpload(finalFileName, this.baseComponent.importOptionsHTML.nativeElement.value);
    }
}