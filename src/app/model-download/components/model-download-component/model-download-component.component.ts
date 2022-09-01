import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { interval, timer } from 'rxjs';
import { first } from 'rxjs/operators';
import { ConfigManager } from 'src/app/base/services/config-service';
import { NotificationService } from 'src/app/base/services/notification.service';
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
  downloadedModelsQuery$: any;
  projectId: string;
  form: FormGroup;
  embeddings: any[] = [];
  isManaged: boolean = false;
  currentEmbeddingHandle: any;
  downloadedModels: any[];

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
    this.prepareEmbeddings();
    this.isManaged = ConfigManager.getIsManaged();

    this.downloadedModelsList$.subscribe((downloadedModels) => this.downloadedModels = downloadedModels)

    NotificationService.subscribeToNotification(this, {
      projectId: this.projectId,
      whitelist: ['model_provider_download'],
      func: this.handleWebsocketNotification
    });
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
    this.informationSourceApolloService
      .downloadModel(this.projectId, this.form.get('name').value)
      .pipe(first()).subscribe();
  }

  parseUTC(utc: any) {
    const milliseconds = +utc * 1000;
    const utcDate = dateAsUTCDate(new Date(milliseconds));
    return utcDate.toLocaleString();
  }

  prepareEmbeddings() {
    this.projectApolloService.getRecomendedEncodersForEmbeddings(this.projectId)
      .subscribe((embeddings) => {
        this.embeddings = embeddings.filter(el =>
          el.configString != 'bag-of-characters' && el.configString != 'bag-of-words' && el.configString != 'tf-idf');
      });
  }

  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  selectFirstUnhiddenEmbeddingHandle(inputElement: HTMLInputElement) {
    for (let embeddingHandle of this.embeddings) {
      if (!embeddingHandle.hidden && !embeddingHandle.forceHidden) {
        this.selectEmbeddingHandle(embeddingHandle, inputElement);
        return;
      }
    }
  }

  selectEmbeddingHandle(embeddingHandle, inputElement: HTMLInputElement) {
    inputElement.value = embeddingHandle.configString;
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    this.checkEmbeddingHandles(inputElement);
  }

  checkEmbeddingHandles(eventTarget: HTMLInputElement) {
    this.form.get('name').setValue(eventTarget.value);
    if (!this.embeddings || this.embeddings.length == 0) return;
    const lowerEventValue = eventTarget.value.toLowerCase();
    for (let embeddingHandle of this.embeddings) {
      embeddingHandle.hidden = !embeddingHandle.configString.toLowerCase().includes(lowerEventValue)
    }

  }
  
  setCurrentEmbeddingHandle(embeddingHandle, hoverBox: HTMLElement, listElement: HTMLElement) {
    this.currentEmbeddingHandle = embeddingHandle;
    if (embeddingHandle) {
      const dataBoundingBox: DOMRect = listElement.getBoundingClientRect();
      hoverBox.style.top = (dataBoundingBox.top) + "px"
      hoverBox.style.left = (dataBoundingBox.left + dataBoundingBox.width) + "px"
    }
  }

  handleWebsocketNotification(msgParts) {
    if(msgParts[1] === 'model_provider_download' && msgParts[2] === 'started') {
      this.downloadedModels.push({
        "name": msgParts[3],
        "date": this.parseUTC(new Date().getSeconds()),
        "status": "initializing"
      });
      timer(2500).subscribe(() => this.downloadedModelsQuery$.refetch());
      
    }
  }

}
