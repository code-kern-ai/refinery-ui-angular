import { Router } from "@angular/router";
import { first } from "rxjs/operators";
import { Project } from "src/app/base/entities/project";
import { ProjectApolloService } from "src/app/base/services/project/project-apollo.service";
import { UploadComponent } from "../upload/upload.component";
import { UploadHelper } from "./upload-helper";
import { UploadFileType } from "./upload-types";

export class RecordNewUploadHelper {
    projectTitle: string = '';
    description: string = '';
    selectedTokenizer: string = 'en_core_web_sm';
    uploadHelper: UploadHelper;

    constructor(private projectApolloService: ProjectApolloService, private baseComponent: UploadComponent) {
        this.uploadHelper = new UploadHelper();
        this.baseComponent = baseComponent;
    }

    doUpload(): void {
        this.projectApolloService
            .createProject(this.projectTitle.trim(), this.description.trim())
            .pipe(first()).subscribe((p: Project) => {
                this.uploadHelper.setProjectId(p.id, this.baseComponent);
                this.uploadHelper.executeUploadFile(UploadFileType.RECORDS, this.baseComponent);
            });

    }
}

export class RecordAddUploadHelper {
    uploadHelper: UploadHelper;
    projectName: string = '';

    constructor(private baseComponent: UploadComponent) {
        this.uploadHelper = new UploadHelper();
        this.baseComponent = baseComponent;
    }

    doUpload(): void {
        this.uploadHelper.setProjectId(this.baseComponent.projectId, this.baseComponent);
        this.uploadHelper.executeUploadFile(UploadFileType.RECORDS, this.baseComponent);
    }
}

export class ExistingProjectUploadHelper {
    uploadHelper: UploadHelper;

    constructor(private projectApolloService: ProjectApolloService, private baseComponent: UploadComponent) {
        this.uploadHelper = new UploadHelper();
        this.baseComponent = baseComponent;
    }

    doUpload(): void {
        this.projectApolloService
            .createProject("Imported Project", "Created during file upload " + this.baseComponent.file.name)
            .pipe(first()).subscribe((p: Project) => {
                this.uploadHelper.setProjectId(p.id, this.baseComponent);
                this.uploadHelper.executeUploadFile(UploadFileType.PROJECT, this.baseComponent);
            });
    }
}

export class LookupListsUploadHelper {
    uploadHelper: UploadHelper;

    constructor(private baseComponent: UploadComponent) {
        this.uploadHelper = new UploadHelper();
        this.baseComponent = baseComponent;
    }

    doUpload(): void {
        this.uploadHelper.setProjectId(this.baseComponent.projectId, this.baseComponent);
        this.uploadHelper.executeUploadFile(UploadFileType.KNOWLEDGE_BASE, this.baseComponent);
    }
}