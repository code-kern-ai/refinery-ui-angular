import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { first } from 'rxjs/operators';
import { ProjectApolloService } from 'src/app/base/services/project/project-apollo.service';
import { RouteService } from 'src/app/base/services/route.service';
import { WeakSourceApolloService } from 'src/app/base/services/weak-source/weak-source-apollo.service';
import { dateAsUTCDate } from 'src/app/util/helper-functions';

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
  form: FormGroup;
  embeddings$: any;

  constructor(
    private activatedRoute: ActivatedRoute,
    private projectApolloService: ProjectApolloService,
    private routeService: RouteService,
    private informationSourceApolloService: WeakSourceApolloService,
    private formBuilder: FormBuilder
    ) { }

  ngOnInit(): void {
    this.initForm();
    this.routeService.updateActivatedRoute(this.activatedRoute);
    this.projectId = this.activatedRoute.parent.snapshot.paramMap.get('projectId');
    [this.projectQuery$, this.project$] = this.projectApolloService.getProjectByIdQuery(this.projectId);
    this.downloadedModelsList$ = this.informationSourceApolloService.getModelProviders();
    this.embeddings$ = this.projectApolloService.getRecomendedEncodersForEmbeddings(this.projectId);
  }

  initForm() {
    this.form = this.formBuilder.group({
      name: ['', Validators.required],
      revision: ['']
    })
  }

  deleteModelProvider(name: string, revision: string) {
    this.informationSourceApolloService
    .deleteModelProvider(name, revision)
    .pipe(first()).subscribe();
  }

  addModelProvider() {
    this.informationSourceApolloService
    .createModelProvider(this.form.get('name').value,this.form.get('revision').value)
    .pipe(first()).subscribe();
  }
  
  parseUTC(utc: any) {
    const milliseconds = +utc * 1000;
    const utcDate = dateAsUTCDate(new Date(milliseconds));
    return utcDate.toLocaleString();
  }


}
