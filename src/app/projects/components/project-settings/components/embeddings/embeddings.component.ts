import { Component, ElementRef, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { Subscription, timer } from 'rxjs';
import { first } from 'rxjs/operators';
import { Project } from 'src/app/base/entities/project';
import { NotificationService } from 'src/app/base/services/notification.service';
import { ProjectApolloService } from 'src/app/base/services/project/project-apollo.service';
import { Attribute } from '../../entities/attribute.type';
import { DownloadedModel } from '../../entities/downloaded-model.type';
import { Embedding, EmbeddingPlatform } from '../../entities/embedding.type';
import { DataHandlerHelper } from '../../helper/data-handler-helper';
import { SettingModals } from '../../helper/modal-helper';
import { EmbeddingType, PlatformType, platformNamesDict } from '../../helper/project-settings-helper';
import { jsonCopy } from 'src/app/util/helper-functions';
import { OrganizationApolloService } from 'src/app/base/services/organization/organization-apollo.service';
import { Organization } from 'src/app/base/entities/organization';

@Component({
  selector: 'kern-embeddings',
  templateUrl: './embeddings.component.html',
  styleUrls: ['./embeddings.component.scss'],
})
export class EmbeddingsComponent implements OnInit, OnDestroy, OnChanges {

  @Input() project: Project;
  @Input() useableTextAttributes: Attribute[];
  @Input() useableAttributes: Attribute[];
  @Input() settingModals: SettingModals;
  @Input() isManaged: boolean;
  @Input() embeddings: Embedding[];
  @Input() embeddingHandles: { [embeddingId: string]: any };
  @Input() dataHandlerHelper: DataHandlerHelper;
  @Input() attributes: Attribute[];
  @Input() embeddingPlatforms: EmbeddingPlatform[];

  @ViewChild('gdprText') gdprText: ElementRef;
  downloadedModels: DownloadedModel[];
  subscriptions$: Subscription[] = [];
  somethingLoading: boolean = false;
  downloadedModelsQuery$: any;
  embeddingHandlesCopy: { [embeddingId: string]: any };;
  selectedPlatform: EmbeddingPlatform;
  organization: Organization;

  get PlatformType(): typeof PlatformType {
    return PlatformType;
  }

  constructor(private projectApolloService: ProjectApolloService, private organizationApolloService: OrganizationApolloService) { }

  ngOnInit(): void {
    this.prepareDownloadedModels();
    this.organizationApolloService.getUserOrganization().pipe(first()).subscribe((organization) => {
      this.organization = organization;
    });

    NotificationService.subscribeToNotification(this, {
      whitelist: ['model_provider_download'],
      func: this.handleWebsocketNotification
    });
  }

  ngOnDestroy() {
    this.subscriptions$.forEach((subscription) => subscription.unsubscribe());
    NotificationService.unsubscribeFromNotification(this, this.project.id);
  }

  ngOnChanges(changes: SimpleChanges) {
    this.checkStillLoading();
    if (changes.embeddingHandles) {
      this.embeddingHandlesCopy = jsonCopy(this.embeddingHandles);
      this.checkModelDownloaded();
    }
    if (changes.embeddingPlatforms && this.embeddingPlatforms) {
      this.prepareEmbeddingPlatforms();
      this.selectedPlatform = this.embeddingPlatforms[0];
    }
  }

  prepareDownloadedModels() {
    let downloadedModelsList$;
    [this.downloadedModelsQuery$, downloadedModelsList$] = this.projectApolloService.getModelProviderInfo();
    this.subscriptions$.push(
      downloadedModelsList$.subscribe((downloadedModels) => {
        this.downloadedModels = downloadedModels;
        this.checkModelDownloaded();
      }));
  }

  prepareEmbeddingPlatforms() {
    if (this.organization.gdprCompliant && this.isManaged) {
      this.embeddingPlatforms = this.embeddingPlatforms.filter((platform) => platform.gdprCompliant === true);
    }
    this.embeddingPlatforms.forEach((platform: EmbeddingPlatform) => {
      platform.name = platformNamesDict[platform.platform];
    });
  }

  checkForceHiddenHandles() {
    const form = this.settingModals.embedding.create.embeddingCreationFormGroup;
    const granularity = form.get('granularity').value;
    const attId = form.get('targetAttribute').value;
    const platform = form.get('platform').value;
    let suggestionList = this.embeddingHandlesCopy[attId];
    if (platform == PlatformType.PYTHON) {
      suggestionList = suggestionList.filter(e => e.configString == 'bag-of-words' || e.configString == 'bag-of-characters' || e.configString == 'tf-idf');
      this.embeddingHandles[attId] = suggestionList;
    } else if (platform == PlatformType.OPEN_AI) {
      suggestionList = suggestionList.filter(e => e.configString == 'text-embedding-ada-002');
      this.embeddingHandles[attId] = suggestionList;
    } else if (platform == PlatformType.HUGGING_FACE) {
      this.embeddingHandles[attId] = this.embeddingHandlesCopy[attId];
      this.checkModelDownloaded();
    }
    for (let element of suggestionList) {
      element.forceHidden = true;
      const parseEl = JSON.parse(element.applicability);
      if ((granularity == EmbeddingType.ON_ATTRIBUTE && parseEl.attribute)
        || (granularity == EmbeddingType.ON_TOKEN && parseEl.token)) {
        element.forceHidden = false;
      }
    }
    this.selectedPlatform = this.embeddingPlatforms.find((p: EmbeddingPlatform) => p.platform == platform);
    form.get('model').setValue(null);
    form.get('apiToken').setValue(null);
    form.get('termsAccepted').setValue(false);
  }

  deleteEmbedding() {
    const elementId = this.settingModals.embedding.delete.id;
    if (!elementId) return;
    if (this.settingModals.embedding.delete.isQueueElement) {
      this.projectApolloService
        .deleteFromTaskQueue(this.project.id, elementId).pipe(first())
        .subscribe(() => {
          this.embeddings = this.embeddings.filter(e => e.id != elementId);
          this.settingModals.embedding.create.blocked = !this.dataHandlerHelper.canCreateEmbedding(this.settingModals, this.embeddings, this.attributes);
        });

    }
    else {
      this.projectApolloService
        .deleteEmbedding(this.project.id, elementId).pipe(first())
        .subscribe(() => {
          this.embeddings = this.embeddings.filter(e => e.id != elementId);
          this.settingModals.embedding.create.blocked = !this.dataHandlerHelper.canCreateEmbedding(this.settingModals, this.embeddings, this.attributes);
        });
    }
  }

  addEmbedding() {
    if (!this.dataHandlerHelper.canCreateEmbedding(this.settingModals, this.embeddings, this.attributes)) return;
    const embeddingForm = this.settingModals.embedding.create.embeddingCreationFormGroup;
    const attributeId = embeddingForm.get("targetAttribute").value;
    const platform = embeddingForm.get("platform").value;

    const config = {
      ...((platform == PlatformType.HUGGING_FACE || platform == PlatformType.PYTHON) && { model: embeddingForm.get("model").value }),
      ...(platform == PlatformType.OPEN_AI && { model: embeddingForm.get("model").value, apiToken: embeddingForm.get("apiToken").value }),
      ...(platform == PlatformType.COHERE && { apiToken: embeddingForm.get("apiToken").value }),
      platform: platform,
      termsText: this.gdprText.nativeElement.innerHTML,
      termsAccepted: embeddingForm.get("termsAccepted").value,
      embeddingType: embeddingForm.get("granularity").value.substring(3) === "TOKEN" ? EmbeddingType.ON_TOKEN : EmbeddingType.ON_ATTRIBUTE
    };

    this.projectApolloService.createEmbedding(
      this.project.id,
      attributeId,
      JSON.stringify(config)
    ).pipe(first()).subscribe(() => {
      this.settingModals.embedding.create.embeddingCreationFormGroup.get("platform").setValue(PlatformType.HUGGING_FACE);
      this.settingModals.embedding.create.embeddingCreationFormGroup.get("model").setValue(null);
      this.settingModals.embedding.create.embeddingCreationFormGroup.get("apiToken").setValue(null);
    });
  }

  selectFirstUnhiddenEmbeddingHandle(inputElement: HTMLInputElement) {
    let suggestionList = this.embeddingHandles[this.settingModals.embedding.create.embeddingCreationFormGroup.get("targetAttribute").value];
    for (let model of suggestionList) {
      if (!model.hidden && !model.forceHidden) {
        this.selectEmbeddingHandle(model, inputElement);
        return;
      }
    }
  }

  selectEmbeddingHandle(model: Embedding, inputElement: HTMLInputElement, hoverBox?: any) {
    inputElement.value = model.configString;
    if (hoverBox) hoverBox.style.display = 'none';
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    this.checkEmbeddingHandles(inputElement);
  }

  checkEmbeddingHandles(eventTarget: HTMLInputElement) {
    const embeddingForm = this.settingModals.embedding.create.embeddingCreationFormGroup;
    embeddingForm.get('model').setValue(eventTarget.value);
    let suggestionList = this.embeddingHandles[embeddingForm.get("targetAttribute").value];
    if (!suggestionList || suggestionList.length == 0) return;
    const lowerEventValue = eventTarget.value.toLowerCase();
    let suggestionsSave = [];
    for (let model of suggestionList) {
      model = { ...model, hidden: !model.configString.toLowerCase().includes(lowerEventValue) };
      suggestionsSave.push(model)
    }
    this.embeddingHandles[embeddingForm.get("targetAttribute").value] = suggestionsSave;
  }

  setCurrentEmbeddingHandle(model: any, hoverBox: HTMLElement, listElement: HTMLElement) {
    if (hoverBox != null) hoverBox.style.display = 'block';
    this.settingModals.embedding.create.currentEmbeddingHandle = model;
    if (model) {
      const dataBoundingBox: DOMRect = listElement.getBoundingClientRect();
      hoverBox.style.top = (dataBoundingBox.top - 60) + "px"
      hoverBox.style.left = (dataBoundingBox.left + dataBoundingBox.width) + "px"
    }
  }

  checkModelDownloaded() {
    if (!this.embeddingHandles || !this.downloadedModels) return;
    for (let key in this.embeddingHandles) {
      let value = this.embeddingHandles[key];
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
    this.somethingLoading = this.useableAttributes == undefined || this.useableAttributes?.length == 0 || this.embeddingHandles == undefined || (this.isManaged && this.downloadedModels?.length == 0);
  }

  handleWebsocketNotification(msgParts) {
    if (msgParts[1] === 'model_provider_download' && msgParts[2] === 'finished') {
      timer(2500).subscribe(() => this.downloadedModelsQuery$.refetch());
    }
  }
}
