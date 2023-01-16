import { Router } from "@angular/router";
import { first } from "rxjs/operators";
import { Project } from "src/app/base/entities/project";
import { ProjectApolloService } from "src/app/base/services/project/project-apollo.service";
import { UploadHelper } from "./upload-helper";
import { UploadFileType } from "./upload-types";
import { UploadComponent } from "./upload.component";

export class RecordNewUploadHelper {
    projectTitle: string = '';
    description: string = '';
    selectedTokenizer: string = 'en_core_web_sm';
    uploadHelper: UploadHelper;

    constructor(private projectApolloService: ProjectApolloService, private router: Router, private baseComponent: UploadComponent) {
        this.uploadHelper = new UploadHelper(router);
        this.baseComponent = baseComponent;
    }

    doUpload(): void {
        this.projectApolloService
            .createProject(this.projectTitle.trim(), this.description.trim())
            .pipe(first()).subscribe((p: Project) => {
                this.uploadHelper.setProjectId(p.id, this.baseComponent);
                this.uploadHelper.executeUploadForRecords(UploadFileType.RECORDS, this.baseComponent);
            });

    }
}

export class RecordAddUploadHelper {
    uploadHelper: UploadHelper;


    constructor(private router: Router, private baseComponent: UploadComponent) {
        this.uploadHelper = new UploadHelper(router);
        this.baseComponent = baseComponent;
    }

    doUpload(): void {
        this.uploadHelper.setProjectId(this.baseComponent.projectId, this.baseComponent);
        this.uploadHelper.executeUploadForRecords(UploadFileType.RECORDS, this.baseComponent);
    }
}