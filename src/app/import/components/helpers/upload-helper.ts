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
        this.baseComponent.uploadSpecificHelper.doUpload();
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
        let tokenizer;
        if (this.baseComponent.uploadFileType == UploadFileType.RECORDS_NEW) {
            tokenizer = this.baseComponent.uploadSpecificHelper.selectedTokenizer.split('(')[1].split(')')[0];
        } else {
            tokenizer = this.baseComponent.uploadOptions.tokenizer;
        }
        this.projectApolloService.changeProjectTokenizer(projectId, tokenizer).pipe(first()).subscribe();
        this.projectApolloService.updateProjectStatus(projectId, ProjectStatus.INIT_COMPLETE).pipe(first()).subscribe();
    }
}