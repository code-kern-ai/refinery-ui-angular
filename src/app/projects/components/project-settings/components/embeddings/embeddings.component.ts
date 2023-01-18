import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { Subscription } from 'rxjs';
import { first } from 'rxjs/operators';
import { Project } from 'src/app/base/entities/project';
import { ProjectApolloService } from 'src/app/base/services/project/project-apollo.service';
import { Attribute } from '../../entities/attribute.type';
import { DownloadedModel } from '../../entities/downloaded-model.type';
import { Embedding } from '../../entities/embedding.type';
import { DataHandlerHelper } from '../../helper/data-handler-helper';
import { SettingModals } from '../../helper/modal-helper';

@Component({
  selector: 'kern-embeddings',
  templateUrl: './embeddings.component.html',
  styleUrls: ['./embeddings.component.scss'],
})
export class EmbeddingsComponent implements OnInit {

  @Input() project: Project;
  @Input() attributesArrayTextUsableUploaded: Attribute[];
  @Input() settingModals: SettingModals;
  @Input() isManaged: boolean;
  @Input() embeddings: Embedding[];
  @Input() embeddingHandlesMap: { [key: string]: any };
  @Input() dataHandlerHelper: DataHandlerHelper;
  @Input() attributes: Attribute[];

  downloadedModels: DownloadedModel[];
  subscriptions$: Subscription[] = [];
  somethingLoading: boolean = false;

  constructor(private projectApolloService: ProjectApolloService) { }

  ngOnInit(): void {
    this.prepareDownloadedModels();
  }

  ngOnDestroy() {
    this.subscriptions$.forEach((subscription) => subscription.unsubscribe());
  }

  ngOnChanges(changes: SimpleChanges) {
    this.checkStillLoading();
    if (changes.embeddingHandlesMap) {
      this.checkModelDownloaded();
    }
  }

  prepareDownloadedModels() {
    let downloadedModelsQuery$, downloadedModelsList$;
    [downloadedModelsQuery$, downloadedModelsList$] = this.projectApolloService.getModelProviderInfo();
    this.subscriptions$.push(
      downloadedModelsList$.subscribe((downloadedModels) => {
        this.downloadedModels = downloadedModels;
        this.checkModelDownloaded();
      }));
  }

  checkForceHiddenHandles() {
    const granularity = this.settingModals.embedding.create.embeddingCreationFormGroup.get('granularity').value;
    const attId = this.settingModals.embedding.create.embeddingCreationFormGroup.get('targetAttribute').value;
    const suggestionList = this.embeddingHandlesMap[attId];
    for (let element of suggestionList) {
      element = { ...element };
      element.forceHidden = true;
      if ((granularity == 'ON_ATTRIBUTE' && element.applicability?.attribute)
        || (granularity == 'ON_TOKEN' && element.applicability?.token)) {
        element.forceHidden = false;
      }
    }
  }

  deleteEmbedding() {
    const embeddingId = this.settingModals.embedding.delete.id;
    if (!embeddingId) return;
    this.projectApolloService
      .deleteEmbedding(this.project.id, embeddingId).pipe(first())
      .subscribe(() => {
        this.embeddings = this.embeddings.filter(e => e.id != embeddingId);
        this.settingModals.embedding.create.blocked = !this.dataHandlerHelper.canCreateEmbedding(this.settingModals, this.embeddings, this.attributes);
      });
  }

  addEmbedding() {
    if (!this.dataHandlerHelper.canCreateEmbedding(this.settingModals, this.embeddings, this.attributes)) return;
    const embeddingForm = this.settingModals.embedding.create.embeddingCreationFormGroup;
    const embeddingHandle = embeddingForm.get("embeddingHandle").value;
    const attributeId = embeddingForm.get("targetAttribute").value;
    const granularity = embeddingForm.get("granularity").value;

    this.projectApolloService.createEmbedding(this.project.id, attributeId, embeddingHandle, granularity.substring(3)).pipe(first()).subscribe();
  }

  selectFirstUnhiddenEmbeddingHandle(inputElement: HTMLInputElement) {
    const suggestionList = this.embeddingHandlesMap[this.settingModals.embedding.create.embeddingCreationFormGroup.get("targetAttribute").value];
    for (let embeddingHandle of suggestionList) {
      if (!embeddingHandle.hidden && !embeddingHandle.forceHidden) {
        this.selectEmbeddingHandle(embeddingHandle, inputElement);
        return;
      }
    }
  }

  selectEmbeddingHandle(embeddingHandle: Embedding, inputElement: HTMLInputElement, hoverBox?: any) {
    inputElement.value = embeddingHandle.configString;
    if (hoverBox) hoverBox.style.display = 'none';
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    this.checkEmbeddingHandles(inputElement);
  }

  checkEmbeddingHandles(eventTarget: HTMLInputElement) {
    const embeddingForm = this.settingModals.embedding.create.embeddingCreationFormGroup;
    embeddingForm.get('embeddingHandle').setValue(eventTarget.value);
    const suggestionList = this.embeddingHandlesMap[embeddingForm.get("targetAttribute").value];
    if (!suggestionList || suggestionList.length == 0) return;
    const lowerEventValue = eventTarget.value.toLowerCase();
    let suggestionsSave = [];
    for (let embeddingHandle of suggestionList) {
      embeddingHandle = { ...embeddingHandle, hidden: !embeddingHandle.configString.toLowerCase().includes(lowerEventValue) };
      suggestionsSave.push(embeddingHandle)
    }
    this.embeddingHandlesMap[embeddingForm.get("targetAttribute").value] = suggestionsSave;
  }

  setCurrentEmbeddingHandle(embeddingHandle: any, hoverBox: HTMLElement, listElement: HTMLElement) {
    if (hoverBox != null) hoverBox.style.display = 'block';
    this.settingModals.embedding.create.currentEmbeddingHandle = embeddingHandle;
    if (embeddingHandle) {
      const dataBoundingBox: DOMRect = listElement.getBoundingClientRect();
      hoverBox.style.top = (dataBoundingBox.top - 60) + "px"
      hoverBox.style.left = (dataBoundingBox.left + dataBoundingBox.width) + "px"
    }
  }

  checkModelDownloaded() {
    if (!this.embeddingHandlesMap || !this.downloadedModels) return;
    for (let key in this.embeddingHandlesMap) {
      let value = this.embeddingHandlesMap[key];
      value.forEach((element: any) => {
        element.isModelDownloaded = this.checkIfModelIsDownloaded(element.configString);
      });
    }
  }

  checkIfModelIsDownloaded(modelName: string) {
    const findModel = this.downloadedModels && this.downloadedModels.find(el => el.name === modelName);
    return findModel !== undefined ? true : false;
  }

  private checkStillLoading() {
    this.somethingLoading = this.attributesArrayTextUsableUploaded == undefined || this.attributesArrayTextUsableUploaded?.length == 0 || this.embeddingHandlesMap == undefined || this.downloadedModels?.length == 0;
  }
}
