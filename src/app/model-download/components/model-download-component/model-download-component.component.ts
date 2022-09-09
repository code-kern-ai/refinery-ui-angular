import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest, Subscription, timer } from 'rxjs';
import { first } from 'rxjs/operators';
import { ConfigManager } from 'src/app/base/services/config-service';
import { NotificationService } from 'src/app/base/services/notification.service';
import { ProjectApolloService } from 'src/app/base/services/project/project-apollo.service';
import { RouteService } from 'src/app/base/services/route.service';
import { WeakSourceApolloService } from 'src/app/base/services/weak-source/weak-source-apollo.service';
import { dateAsUTCDate, formatBytes } from 'src/app/util/helper-functions';

@Component({
  selector: 'kern-model-download-component',
  templateUrl: './model-download-component.component.html',
  styleUrls: ['./model-download-component.component.scss']
})
export class ModelDownloadComponentComponent implements OnInit {

  project$: any;
  projectQuery$: any;
  downloadedModelsList$: any;
  downloadedModelsQuery$: any;
  projectId: string;
  form: FormGroup;
  models: any[] = [];
  isManaged: boolean = true;
  currentModelHandle: any;
  downloadedModels: any[];
  subscriptions$: Subscription[] = [];
  currentModel: any;
  indexSeparator: number;
  lastPage: string;

  constructor(
    private activatedRoute: ActivatedRoute,
    private projectApolloService: ProjectApolloService,
    private routeService: RouteService,
    private informationSourceApolloService: WeakSourceApolloService,
    private formBuilder: FormBuilder,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.initForm();
    this.routeService.updateActivatedRoute(this.activatedRoute);
    this.projectId = this.activatedRoute.parent.snapshot.paramMap.get('projectId');
    this.lastPage = this.activatedRoute.snapshot.queryParamMap.get('lastPage');

    [this.projectQuery$, this.project$] = this.projectApolloService.getProjectByIdQuery(this.projectId);
    [this.downloadedModelsQuery$, this.downloadedModelsList$] = this.informationSourceApolloService.getModelProviderInfo();
    this.prepareModels();

    this.subscriptions$.push(
      this.downloadedModelsList$.subscribe((downloadedModels) => {
        this.downloadedModels = downloadedModels;
        this.downloadedModels.forEach(model => {
          model.sizeFormatted = formatBytes(model.size);
          model.parseDate = this.parseUTC(model.date);
        })
      }));
    
    this.checkIfManagedVersion();

    NotificationService.subscribeToNotification(this, {
      whitelist: ['model_provider_download'],
      func: this.handleWebsocketNotification
    });
  }

  ngOnDestroy(): void {
    this.subscriptions$.forEach((subscription) => subscription.unsubscribe());
    NotificationService.unsubscribeFromNotification(this, this.projectId)
  }

  initForm() {
    this.form = this.formBuilder.group({
      name: ['', Validators.required]
    })
  }

  deleteModel(name: string) {
    this.informationSourceApolloService
      .deleteModel(name)
      .pipe(first()).subscribe();
  }

  downloadModel() {
    if (this.form.invalid) return;
    this.informationSourceApolloService
      .downloadModel(this.form.get('name').value)
      .pipe(first()).subscribe();
  }

  parseUTC(utc: string) {
    const utcDate = dateAsUTCDate(new Date(utc));
    return utcDate.toLocaleString();
  }

  prepareModels() {
    let tasks$ = [];
    let q, vc;
    [q, vc] = this.informationSourceApolloService.getZeroShotRecommendations(this.projectId);
    tasks$.push(this.projectApolloService.getRecomendedEncodersForEmbeddings(this.projectId));
    tasks$.push(vc);
    combineLatest(tasks$).subscribe((models: any) => {
      models[0].forEach(model => model.isZeroShot = false);
      this.models = models[0].filter(el =>
        el.configString != 'bag-of-characters' && el.configString != 'bag-of-words' && el.configString != 'tf-idf');
      models[1].forEach(model => model.isZeroShot = true);
      models[1].sort((a, b) => a.prio - b.prio);
      this.indexSeparator = this.models.length-1;
      this.models.push(...models[1]);
    });


  }

  selectFirstUnhiddenEmbeddingHandle(inputElement: HTMLInputElement) {
    for (let modelHandle of this.models) {
      if (!modelHandle.hidden && !modelHandle.forceHidden) {
        this.selectEmbeddingHandle(modelHandle, inputElement);
        return;
      }
    }
  }

  selectEmbeddingHandle(modelHandle, inputElement: HTMLInputElement) {
    inputElement.value = modelHandle.configString;
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    this.checkEmbeddingHandles(inputElement);
  }

  checkEmbeddingHandles(eventTarget: HTMLInputElement) {
    this.form.get('name').setValue(eventTarget.value);
    if (!this.models || this.models.length == 0) return;
    const lowerEventValue = eventTarget.value.toLowerCase();
    for (let modelHandle of this.models) {
      modelHandle.hidden = !modelHandle.configString.toLowerCase().includes(lowerEventValue)
    }

  }

  setCurrentEmbeddingHandle(modelHandle, hoverBox: HTMLElement, listElement: HTMLElement) {
    this.currentModelHandle = modelHandle;
    if (modelHandle) {
      const dataBoundingBox: DOMRect = listElement.getBoundingClientRect();
      hoverBox.style.top = (dataBoundingBox.top) + "px"
      hoverBox.style.left = (dataBoundingBox.left + dataBoundingBox.width) + "px"
    }
  }

  handleWebsocketNotification(msgParts) {
    if (msgParts[1] === 'model_provider_download' && msgParts[2] === 'started') {
      this.downloadedModels.push({
        "name": msgParts[3],
        "date": dateAsUTCDate(new Date()).toLocaleString(),
        "status": "initializing"
      });
      timer(2500).subscribe(() => this.downloadedModelsQuery$.refetch());
    } else if (msgParts[1] === 'model_provider_download' && msgParts[2] === 'finished') {
      timer(2500).subscribe(() => this.downloadedModelsQuery$.refetch());
    }
  }

  checkIfModelIsDownloaded(modelName: string) {
    const findModel = this.downloadedModels && this.downloadedModels.find(el => el.name === modelName);
    return findModel !== undefined ? true : false;
  }

  goBack() {
    this.router.navigate(["../"+this.lastPage], { relativeTo: this.activatedRoute });
  }

  checkIfManagedVersion() {
    if (!ConfigManager.isInit()) {
      timer(250).subscribe(() => this.checkIfManagedVersion());
      return;
    }
    this.isManaged = ConfigManager.getIsManaged();
  }
}
