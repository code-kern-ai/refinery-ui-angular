import { ProjectStatus } from 'src/app/projects/enums/project-status.enum';

export interface Project {
  id: string;
  name: string;
  initProgress: ProjectStatus;
  projectType: string;
  description?: string;
  numDataScaleUploaded?: number;
  tokenizer?: string;
}
