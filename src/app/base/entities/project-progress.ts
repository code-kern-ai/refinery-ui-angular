export interface ProjectProgressData {
  count_all: number;
  count_annotated: number;
}
export class ProjectProgress {
  count_all: number;
  count_annotated: number;

  public static createProjectProgress(
    data: ProjectProgressData
  ): ProjectProgress {
    const projectProgress = new ProjectProgress();
    projectProgress.count_all = data.count_all;
    projectProgress.count_annotated = data.count_annotated;
    return projectProgress;
  }
}
