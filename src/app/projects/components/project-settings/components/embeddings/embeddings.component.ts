import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
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
  @Input() attributesArrayTextUsableUploaded: Attribute[] = [];
  @Input() settingModals: SettingModals;
  @Input() isManaged: boolean;
  @Input() embeddings: Embedding[] = [];
  @Input() embeddingHandlesMap: Map<string, any> = new Map<string, any>();

  downloadedModelsList$: any;
  downloadedModelsQuery$: any;
  downloadedModels: DownloadedModel[] = [];
  subscriptions$: Subscription[] = [];
  dataHandlerHelper: DataHandlerHelper;

  constructor(private projectApolloService: ProjectApolloService, private formBuilder: FormBuilder) {
    this.dataHandlerHelper = new DataHandlerHelper(this.formBuilder, this.projectApolloService);
  }

  ngOnInit(): void {
    this.prepareDownloadedModels();
  }

  ngOnChanges(changes) {
    this.attributesArrayTextUsableUploaded = changes.attributesArrayTextUsableUploaded?.currentValue;
    this.embeddings = changes.embeddings?.currentValue;
    this.embeddingHandlesMap = changes.embeddingHandlesMap?.currentValue;
  }

  prepareDownloadedModels() {
    [this.downloadedModelsQuery$, this.downloadedModelsList$] = this.projectApolloService.getModelProviderInfo();
    this.subscriptions$.push(
      this.downloadedModelsList$.subscribe((downloadedModels) => this.downloadedModels = downloadedModels));
  }

  checkForceHiddenHandles() {
    const granularity = this.settingModals.embedding.create.embeddingCreationFormGroup.get('granularity').value;
    const attId = this.settingModals.embedding.create.embeddingCreationFormGroup.get('targetAttribute').value;
    const suggestionList = this.embeddingHandlesMap.get(attId)
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
        this.settingModals.embedding.create.blocked = !this.dataHandlerHelper.canCreateEmbedding(this.settingModals, this.embeddings);
      });
  }

  addEmbedding() {
    if (!this.dataHandlerHelper.canCreateEmbedding(this.settingModals, this.embeddings)) return;
    const embeddingForm = this.settingModals.embedding.create.embeddingCreationFormGroup;
    const embeddingHandle = embeddingForm.get("embeddingHandle").value;
    const attributeId = embeddingForm.get("targetAttribute").value;
    const granularity = embeddingForm.get("granularity").value;

    this.projectApolloService.createEmbedding(this.project.id, attributeId, embeddingHandle, granularity.substring(3)).pipe(first()).subscribe();
  }

  selectFirstUnhiddenEmbeddingHandle(inputElement: HTMLInputElement) {
    const suggestionList = this.embeddingHandlesMap.get(this.settingModals.embedding.create.embeddingCreationFormGroup.get("targetAttribute").value)
    for (let embeddingHandle of suggestionList) {
      if (!embeddingHandle.hidden && !embeddingHandle.forceHidden) {
        this.selectEmbeddingHandle(embeddingHandle, inputElement);
        return;
      }
    }
  }

  selectEmbeddingHandle(embeddingHandle, inputElement: HTMLInputElement, hoverBox?: any) {
    inputElement.value = embeddingHandle.configString;
    hoverBox.style.display = 'none';
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    this.checkEmbeddingHandles(inputElement);
  }

  checkEmbeddingHandles(eventTarget: HTMLInputElement,) {
    const embeddingForm = this.settingModals.embedding.create.embeddingCreationFormGroup;
    embeddingForm.get('embeddingHandle').setValue(eventTarget.value);
    const suggestionList = this.embeddingHandlesMap.get(embeddingForm.get("targetAttribute").value);
    if (!suggestionList || suggestionList.length == 0) return;
    const lowerEventValue = eventTarget.value.toLowerCase();
    let suggestionsSave = [];
    for (let embeddingHandle of suggestionList) {
      embeddingHandle = { ...embeddingHandle, hidden: !embeddingHandle.configString.toLowerCase().includes(lowerEventValue) };
      suggestionsSave.push(embeddingHandle)
    }
    this.embeddingHandlesMap.set(embeddingForm.get("targetAttribute").value, suggestionsSave);
  }

  setCurrentEmbeddingHandle(embeddingHandle, hoverBox: HTMLElement, listElement: HTMLElement) {
    this.settingModals.embedding.create.currentEmbeddingHandle = embeddingHandle;
    if (embeddingHandle) {
      const dataBoundingBox: DOMRect = listElement.getBoundingClientRect();
      hoverBox.style.top = (dataBoundingBox.top - 60) + "px"
      hoverBox.style.left = (dataBoundingBox.left + dataBoundingBox.width) + "px"
    }
  }

  checkIfModelIsDownloaded(modelName: string) {
    const findModel = this.downloadedModels && this.downloadedModels.find(el => el.name === modelName);
    return findModel !== undefined ? true : false;
  }
}
