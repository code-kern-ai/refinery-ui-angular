import { UploadFileType } from "./upload-types";
import { UploadComponent } from "../upload/upload.component";
import { ProjectStatus } from "src/app/projects/enums/project-status.enum";
import { first } from "rxjs/operators";
import { ProjectApolloService } from "src/app/base/services/project/project-apollo.service";

export class UploadHelper {
    baseComponent: UploadComponent;

    constructor(baseComponent: UploadComponent, private projectApolloService: ProjectApolloService) {
        this.baseComponent = baseComponent;
    }

    upload(file?: File): void {
        if (file) this.baseComponent.file = file;
        switch (this.baseComponent.uploadFileType) {
            case UploadFileType.RECORDS_NEW:
                this.baseComponent.recordNewUploadHelper.doUpload();
                break;
            case UploadFileType.RECORDS_ADD:
                this.baseComponent.recordAddUploadHelper.doUpload();
                break;
            case UploadFileType.PROJECT:
                this.baseComponent.existingProjectUploadHelper.doUpload();
                break;
            case UploadFileType.KNOWLEDGE_BASE:
                this.baseComponent.lookupListsUploadHelper.doUpload();
                break;
        }
    }

    executionStepsBeforeUploadingToMinIO(projectId: string, uploadFileType: UploadFileType, knowledgeBaseId?: string): string {
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

    setProjectId(projectId: string): void {
        this.baseComponent.projectId = projectId;
    }

    executeUploadFile(uploadFileType: UploadFileType, baseComponent: UploadComponent): void {
        this.baseComponent = baseComponent;
        this.updateTokenizerAndProjectStatus(this.baseComponent.projectId);
        const finalFileName = this.executionStepsBeforeUploadingToMinIO(this.baseComponent.projectId, uploadFileType, this.baseComponent.uploadOptions.knowledgeBaseId);
        const importOptions = uploadFileType == UploadFileType.RECORDS ? this.baseComponent.importOptionsHTML.nativeElement.value : '';
        this.baseComponent.finishUpUpload(finalFileName, importOptions);
    }

    updateTokenizerAndProjectStatus(projectId: string): void {
        const parseTokenizer = this.baseComponent.recordNewUploadHelper.selectedTokenizer.split('(')[1].split(')')[0];
        this.projectApolloService.changeProjectTokenizer(projectId, parseTokenizer).pipe(first()).subscribe();
        this.projectApolloService.updateProjectStatus(projectId, ProjectStatus.INIT_COMPLETE).pipe(first()).subscribe();
    }
}