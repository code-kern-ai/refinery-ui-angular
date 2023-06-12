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
import { EmbeddingType, PlatformType, granularityTypesArray, platformNamesDict } from '../../helper/project-settings-helper';
import { OrganizationApolloService } from 'src/app/base/services/organization/organization-apollo.service';
import { Organization } from 'src/app/base/entities/organization';
import { FormGroup } from '@angular/forms';
import { jsonCopy } from 'submodules/javascript-functions/general';

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
  isCreationOfEmbeddingDisabled: boolean = false;
  granularityArray = granularityTypesArray;

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
    if (changes.embeddingHandles && this.settingModals.embedding.create.embeddingCreationFormGroup) {
      this.embeddingHandlesCopy = jsonCopy(this.embeddingHandles);
      this.prepareSuggestions(this.settingModals.embedding.create.embeddingCreationFormGroup);
      this.checkModelDownloaded();
    }
    if (changes.embeddingPlatforms && this.embeddingPlatforms) {
      this.prepareEmbeddingPlatforms();
      this.selectedPlatform = this.embeddingPlatforms[0];
      this.checkIfPlatformHasToken();
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
    if (this.organization.gdprCompliant) {
      this.embeddingPlatforms = this.embeddingPlatforms.filter((platform) => platform.gdprCompliant === true);
    }
    this.embeddingPlatforms.forEach((platform: EmbeddingPlatform) => {
      platform.name = platformNamesDict[platform.platform];
    });
  }

  checkForceHiddenHandles() {
    const form = this.settingModals.embedding.create.embeddingCreationFormGroup;
    this.prepareSuggestions(form);
    this.selectedPlatform = this.embeddingPlatforms.find((p: EmbeddingPlatform) => p.platform == form.get('platform').value);
    this.checkIfPlatformHasToken();
    this.initEmbeddingModal(false, form.get('platform').value);
  }

  prepareSuggestions(form: FormGroup) {
    const granularity = form.get('granularity').value;
    const attId = form.get('targetAttribute').value;
    const platform = form.get('platform').value;
    const suggestionList = this.embeddingHandlesCopy[attId].filter((e) => e.platform == platform);
    for (let element of suggestionList) {
      element.forceHidden = true;
      const parseEl = JSON.parse(element.applicability);
      if ((granularity == EmbeddingType.ON_ATTRIBUTE && parseEl.attribute)
        || (granularity == EmbeddingType.ON_TOKEN && parseEl.token)) {
        element.forceHidden = false;
      }
    }
    this.embeddingHandles[attId] = suggestionList;
    this.checkIfCreateEmbeddingIsDisabled();
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

    const config: any = {
      platform: platform,
      termsText: this.gdprText.nativeElement.innerHTML,
      termsAccepted: embeddingForm.get("termsAccepted").value,
      embeddingType: embeddingForm.get("granularity").value.substring(3) === "TOKEN" ? EmbeddingType.ON_TOKEN : EmbeddingType.ON_ATTRIBUTE
    }

    if (platform == PlatformType.HUGGING_FACE || platform == PlatformType.PYTHON) {
      config.model = embeddingForm.get("model").value;
    } else if (platform == PlatformType.OPEN_AI) {
      config.model = embeddingForm.get("model").value;
      config.apiToken = embeddingForm.get("apiToken").value;
    } else if (platform == PlatformType.COHERE) {
      config.apiToken = embeddingForm.get("apiToken").value;
    }

    this.projectApolloService.createEmbedding(
      this.project.id,
      attributeId,
      JSON.stringify(config)
    ).pipe(first()).subscribe(() => {
      this.initEmbeddingModal();
      this.selectedPlatform = this.embeddingPlatforms[0];
      this.checkIfPlatformHasToken();
    });
  }

  selectFirstUnhiddenEmbeddingHandle(inputElement: HTMLInputElement) {
    const suggestionList = this.embeddingHandles[this.settingModals.embedding.create.embeddingCreationFormGroup.get("targetAttribute").value];
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
    const suggestionList = this.embeddingHandles[embeddingForm.get("targetAttribute").value];
    if (!suggestionList || suggestionList.length == 0) return;
    const lowerEventValue = eventTarget.value.toLowerCase();
    let suggestionsSave = [];
    for (let model of suggestionList) {
      model = { ...model, hidden: !model.configString.toLowerCase().includes(lowerEventValue) };
      suggestionsSave.push(model)
    }
    this.embeddingHandles[embeddingForm.get("targetAttribute").value] = suggestionsSave;
    this.checkIfCreateEmbeddingIsDisabled();
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

  checkIfCreateEmbeddingIsDisabled() {
    const embeddingForm = this.settingModals.embedding.create.embeddingCreationFormGroup;
    const platform = embeddingForm.get("platform").value;
    const model = embeddingForm.get("model").value;
    const apiToken = embeddingForm.get("apiToken").value;
    const termsAccepted = embeddingForm.get("termsAccepted").value;
    let checkFormFields: boolean = false;

    if (platform == PlatformType.HUGGING_FACE || platform == PlatformType.PYTHON) {
      checkFormFields = model == null;
    } else if (platform == PlatformType.OPEN_AI) {
      checkFormFields = model == null || apiToken == null || apiToken == "" || !termsAccepted;
    } else if (platform == PlatformType.COHERE) {
      checkFormFields = apiToken == null || apiToken == "" || !termsAccepted;
    }
    this.isCreationOfEmbeddingDisabled = this.settingModals.embedding.create.blocked ||
      !(this.useableTextAttributes && this.settingModals.embedding.create.embeddingCreationFormGroup) || checkFormFields;
  }

  initEmbeddingModal(fullInit: boolean = false, defaultPlatform: PlatformType = PlatformType.HUGGING_FACE) {
    if (fullInit) {
      this.settingModals.embedding.create.embeddingCreationFormGroup.reset();
    } else {
      const form = this.settingModals.embedding.create.embeddingCreationFormGroup;
      form.get("platform").setValue(defaultPlatform);
      form.get("model").setValue(null);
      form.get("apiToken").setValue(null);
      form.get("termsAccepted").setValue(false);
    }
  }

  closeModal() {
    this.settingModals.embedding.create.open = false;
    this.settingModals.embedding.create.embeddingCreationFormGroup.get('termsAccepted').setValue(null);
  }

  checkIfPlatformHasToken() {
    if (this.selectedPlatform.platform == PlatformType.COHERE || this.selectedPlatform.platform == PlatformType.OPEN_AI) {
      this.granularityArray = this.granularityArray.filter((g) => g.value != EmbeddingType.ON_TOKEN);
    } else {
      this.granularityArray = this.dataHandlerHelper.granularityTypesArray;
    }
  }
}
