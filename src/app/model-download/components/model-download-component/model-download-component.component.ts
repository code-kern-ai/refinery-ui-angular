import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription, timer } from 'rxjs';
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
  isManaged: boolean = false;
  currentModelHandle: any;
  downloadedModels: any[];
  subscriptions$: Subscription[] = [];
  currentModel: any;

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
    [this.downloadedModelsQuery$, this.downloadedModelsList$] = this.informationSourceApolloService.getModelProviderInfo();
    this.prepareModels();
    this.isManaged = ConfigManager.getIsManaged();

    this.subscriptions$.push(
      this.downloadedModelsList$.subscribe((downloadedModels) => {
        this.downloadedModels = downloadedModels;
        this.downloadedModels.forEach(model => {
          model.size = formatBytes(model.size);
        })
      }));

    NotificationService.subscribeToNotification(this, {
      projectId: this.projectId,
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

  deleteModel(name: string, revision: string) {
    this.informationSourceApolloService
    .deleteModel(name,revision)
    .pipe(first()).subscribe();
  }

  downloadModel() {
    if(this.form.invalid) return ;
    this.informationSourceApolloService
      .downloadModel(this.projectId, this.form.get('name').value)
      .pipe(first()).subscribe();
  }

  parseUTC(utc: any) {
    const milliseconds = +utc * 1000;
    const utcDate = dateAsUTCDate(new Date(milliseconds));
    return utcDate.toLocaleString();
  }

  prepareModels() {
    this.projectApolloService.getRecomendedEncodersForEmbeddings(this.projectId)
      .pipe(first())
      .subscribe((models) => {
        this.models = models.filter(el =>
          el.configString != 'bag-of-characters' && el.configString != 'bag-of-words' && el.configString != 'tf-idf');
          this.prepareZeroShotRecommendations(this.projectId);
      });
      
  }

  prepareZeroShotRecommendations(projectId: string) {
    let q, vc;
    [q, vc] = this.informationSourceApolloService.getZeroShotRecommendations(projectId);
    vc.pipe(first()).subscribe((r) => {
      r.forEach((rec) => this.models.push(rec)
      )
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
    if(msgParts[1] === 'model_provider_download' && msgParts[2] === 'started') {
      this.downloadedModels.push({
        "name": msgParts[3],
        "date": dateAsUTCDate(new Date()).toLocaleString(),
        "status": "initializing"
      });
      timer(2500).subscribe(() => this.downloadedModelsQuery$.refetch());
    } else if(msgParts[1] === 'model_provider_download' && msgParts[2] === 'finished') {
      timer(2500).subscribe(() => this.downloadedModelsQuery$.refetch());
    }
  }

  checkIfModelIsDownloaded(modelName: string) {
    const findModel = this.downloadedModels && this.downloadedModels.find(el => el.name === modelName);
    return findModel !== undefined ? true : false;
  }

}
