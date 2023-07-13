import { first } from "rxjs/operators";
import { Project } from "src/app/base/entities/project";
import { ProjectApolloService } from "src/app/base/services/project/project-apollo.service";
import { UploadComponent } from "../upload/upload.component";
import { UploadFileType } from "./upload-types";

export class RecordNewUploadHelper {
    projectTitle: string = '';
    description: string = '';
    selectedTokenizer: string = 'English (en_core_web_sm)';

    constructor(private projectApolloService: ProjectApolloService, private baseComponent: UploadComponent) {
        this.baseComponent = baseComponent;
    }

    doUpload(): void {
        this.projectApolloService
            .createProject(this.projectTitle.trim(), this.description.trim())
            .pipe(first()).subscribe((p: Project) => {
                this.baseComponent.uploadHelper.setProjectId(p.id);
                this.baseComponent.uploadHelper.executeUploadFile(UploadFileType.RECORDS, this.baseComponent);
            });

    }
}

export class RecordAddUploadHelper {
    projectName: string = '';
    recalculationCosts: boolean = false;

    constructor(private baseComponent: UploadComponent) {
        this.baseComponent = baseComponent;
    }

    doUpload(): void {
        this.baseComponent.uploadHelper.setProjectId(this.baseComponent.projectId);
        this.baseComponent.uploadHelper.executeUploadFile(UploadFileType.RECORDS, this.baseComponent);
    }
}

export class ExistingProjectUploadHelper {
    selectedTokenizer: string = '(en_core_web_sm)';

    constructor(private projectApolloService: ProjectApolloService, private baseComponent: UploadComponent) {
        this.baseComponent = baseComponent;
    }

    doUpload(): void {
        this.projectApolloService
            .createProject(this.baseComponent.uploadOptions.projectName, "Created during file upload " + this.baseComponent.file.name)
            .pipe(first()).subscribe((p: Project) => {
                this.baseComponent.uploadHelper.setProjectId(p.id);
                this.baseComponent.uploadOptions.tokenizer = this.selectedTokenizer;
                this.baseComponent.uploadHelper.executeUploadFile(UploadFileType.PROJECT, this.baseComponent);
            });
    }
}

export class LookupListsUploadHelper {

    constructor(private baseComponent: UploadComponent) {
        this.baseComponent = baseComponent;
    }

    doUpload(): void {
        this.baseComponent.uploadHelper.setProjectId(this.baseComponent.projectId);
        this.baseComponent.uploadHelper.executeUploadFile(UploadFileType.KNOWLEDGE_BASE, this.baseComponent);
    }
}