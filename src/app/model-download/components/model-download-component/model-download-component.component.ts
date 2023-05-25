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
import { getUserAvatarUri } from 'src/app/util/helper-functions';
import { RouteManager } from 'src/app/util/route-manager';
import { UserManager } from 'src/app/util/user-manager';
import { createDefaultModelDownloadModals, ModelDownloadModals } from './model-download-helper';
import { dateAsUTCDate, parseUTC } from 'submodules/javascript-functions/date-parser';
import { formatBytes } from 'submodules/javascript-functions/general';

@Component({
  selector: 'kern-model-download-component',
  templateUrl: './model-download-component.component.html',
  styleUrls: ['./model-download-component.component.scss']
})
export class ModelDownloadComponentComponent implements OnInit {

  downloadedModelsList$: any;
  downloadedModelsQuery$: any;
  models: any[] = [];
  isManaged: boolean = true;
  downloadedModels: any[];
  subscriptions$: Subscription[] = [];
  loggedInUser: any;
  avatarUri: any;
  downloadedModelsModals: ModelDownloadModals = createDefaultModelDownloadModals();

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
    [this.downloadedModelsQuery$, this.downloadedModelsList$] = this.projectApolloService.getModelProviderInfo();
    this.prepareModels();

    this.subscriptions$.push(
      this.downloadedModelsList$.subscribe((downloadedModels) => {
        this.downloadedModels = downloadedModels;
        let saveDownloadedModels = [];
        this.downloadedModels.forEach(model => {
          model = { ...model, sizeFormatted: formatBytes(model.size), parseDate: parseUTC(model.date) };
          saveDownloadedModels.push(model);
        })
        this.downloadedModels = saveDownloadedModels;
      }));

    this.checkIfManagedVersion();

    NotificationService.subscribeToNotification(this, {
      whitelist: ['model_provider_download'],
      func: this.handleWebsocketNotification
    });
    UserManager.registerAfterInitActionOrRun(this, () => {
      this.loggedInUser = UserManager.getUser();
      this.avatarUri = getUserAvatarUri(this.loggedInUser)

    }, true);
  }

  ngOnDestroy(): void {
    this.subscriptions$.forEach((subscription) => subscription.unsubscribe());
    NotificationService.unsubscribeFromNotification(this)
  }

  initForm() {
    this.downloadedModelsModals.addNewModel.form = this.formBuilder.group({
      name: ['', Validators.required]
    })
  }

  deleteModel() {
    this.projectApolloService
      .deleteModel(this.downloadedModelsModals.deleteModel.name)
      .pipe(first()).subscribe();
  }

  downloadModel() {
    if (this.downloadedModelsModals.addNewModel.form.invalid) return;
    this.projectApolloService
      .downloadModel(this.downloadedModelsModals.addNewModel.form.get('name').value)
      .pipe(first()).subscribe(() => {
        this.downloadedModelsModals.addNewModel.form.reset();
      });
  }

  prepareModels() {
    let tasks$ = [];
    let q, vc;
    [q, vc] = this.informationSourceApolloService.getZeroShotRecommendations();
    tasks$.push(this.projectApolloService.getRecommendedEncodersForEmbeddings());
    tasks$.push(vc);
    combineLatest(tasks$).subscribe((models: any) => {
      this.models = models[0].filter(el =>
        el.configString != 'bag-of-characters' && el.configString != 'bag-of-words' && el.configString != 'tf-idf');
      models[1].sort((a, b) => a.prio - b.prio);
      this.downloadedModelsModals.addNewModel.indexSeparator = this.models.length - 1;
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
    this.downloadedModelsModals.addNewModel.form.get('name').setValue(eventTarget.value);
    if (!this.models || this.models.length == 0) return;
    const lowerEventValue = eventTarget.value.toLowerCase();
    for (let modelHandle of this.models) {
      modelHandle.hidden = !modelHandle.configString.toLowerCase().includes(lowerEventValue)
    }

  }

  setCurrentEmbeddingHandle(modelHandle, hoverBox: HTMLElement, listElement: HTMLElement) {
    this.downloadedModelsModals.deleteModel.currentModelHandle = modelHandle;
    if (modelHandle) {
      const dataBoundingBox: DOMRect = listElement.getBoundingClientRect();
      hoverBox.style.top = (dataBoundingBox.top - 60) + "px"
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

  clickBack() {
    RouteManager.moveBack();
  }

  checkIfManagedVersion() {
    if (!ConfigManager.isInit()) {
      timer(250).subscribe(() => this.checkIfManagedVersion());
      return;
    }
    this.isManaged = ConfigManager.getIsManaged();
  }
}
