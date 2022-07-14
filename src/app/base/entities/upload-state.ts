import { UploadStates } from "src/app/import/services/s3.enums";


export interface UploadState {
  progress: number;
  state: UploadStates;
}
