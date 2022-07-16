import { Injectable } from '@angular/core';
import { Observable, ReplaySubject } from 'rxjs';
import { Project } from '../entities/project';

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  private project$ = new ReplaySubject<Project>();

  readOnlyProject$: Observable<Project>;

  constructor() {
    this.readOnlyProject$ = this.project$.asObservable();
  }

  public setProject(project: Project) {
    this.project$.next(project);
  }

  public getProject(): Observable<Project> {
    return this.readOnlyProject$;
  }
}
