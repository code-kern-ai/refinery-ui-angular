import { RecordAddUploadHelper, RecordNewUploadHelper } from "./upload-specific";
import { UploadFileType } from "./upload-types";
import { UploadComponent } from "./upload.component";

export class UploadHelper {
    private baseComponent: UploadComponent;
    private recordNewUploadHelper: RecordNewUploadHelper;
    private recordAddUploadHelper: RecordAddUploadHelper;

    constructor(baseComponent: UploadComponent, recordNewUploadHelper: RecordNewUploadHelper, recordAddUploadHelper: RecordAddUploadHelper) {
        this.baseComponent = baseComponent;
        this.recordNewUploadHelper = recordNewUploadHelper;
        this.recordAddUploadHelper = recordAddUploadHelper;
    }

    upload(): void {
        switch (this.baseComponent.uploadFileType) {
            case UploadFileType.RECORDS_NEW:
                this.recordNewUploadHelper.doUpload();
                break;
            case UploadFileType.RECORDS_ADD:
                this.recordAddUploadHelper.doUpload();
                break;

        }
    }

    uploadFileToMinio(): void {

    }
}