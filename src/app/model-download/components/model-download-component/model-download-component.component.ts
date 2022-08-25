import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { first } from 'rxjs/operators';
import { ProjectApolloService } from 'src/app/base/services/project/project-apollo.service';
import { RouteService } from 'src/app/base/services/route.service';
import { WeakSourceApolloService } from 'src/app/base/services/weak-source/weak-source-apollo.service';

@Component({
  selector: 'kern-model-download-component',
  templateUrl: './model-download-component.component.html',
  styleUrls: ['./model-download-component.component.scss']
})
export class ModelDownloadComponentComponent implements OnInit {

  project$: any;
  projectQuery$: any;
  downloadedModelsList$: any;
  projectId: string;

  constructor(
    private activatedRoute: ActivatedRoute,
    private projectApolloService: ProjectApolloService,
    private routeService: RouteService,
    private informationSourceApolloService: WeakSourceApolloService
    ) { }

  ngOnInit(): void {
    this.routeService.updateActivatedRoute(this.activatedRoute);
    this.projectId = this.activatedRoute.parent.snapshot.paramMap.get('projectId');
    [this.projectQuery$, this.project$] = this.projectApolloService.getProjectByIdQuery(this.projectId);
    this.downloadedModelsList$ = this.informationSourceApolloService.getAllDownloadedModels(this.projectId);
  }

  deleteModel() {
    this.informationSourceApolloService
    .deleteDownloadedModel(this.projectId)
    .pipe(first()).subscribe();
  }

  addNewModel(name: string, link: string, version: string) {
    this.informationSourceApolloService
    .addNewModel(this.projectId, name, link, version)
    .pipe(first()).subscribe();
  }

}
