import { Router } from "@angular/router";
import { first } from "rxjs/operators";
import { Project } from "src/app/base/entities/project";
import { ProjectApolloService } from "src/app/base/services/project/project-apollo.service";
import { UploadHelper } from "./upload-helper";
import { UploadFileType } from "./upload-types";

export class RecordNewUploadHelper {
    projectTitle: string = '';
    description: string = '';
    selectedTokenizer: string = 'en_core_web_sm';
    uploadHelper: UploadHelper;

    constructor(private projectApolloService: ProjectApolloService, private router: Router) {
        this.uploadHelper = new UploadHelper(router);
    }

    doUpload(): void {
        this.projectApolloService
            .createProject(this.projectTitle.trim(), this.description.trim())
            .pipe(first()).subscribe((p: Project) => {
                this.uploadHelper.setProjectId(p.id);
                this.uploadHelper.executeUploadForRecords(UploadFileType.RECORDS_NEW);
            });

    }
}

export class RecordAddUploadHelper {
    projectId: string;

    constructor() { }

    doUpload(): void {
    }
}