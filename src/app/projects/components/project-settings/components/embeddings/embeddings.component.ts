import { Component, ElementRef, Input, OnChanges, OnDestroy, OnInit, PLATFORM_ID, SimpleChanges, ViewChild } from '@angular/core';
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
import { DEFAULT_AZURE_TYPE, EmbeddingType, PlatformType, granularityTypesArray, platformNamesDict } from '../../helper/project-settings-helper';
import { OrganizationApolloService } from 'src/app/base/services/organization/organization-apollo.service';
import { Organization } from 'src/app/base/entities/organization';
import { FormGroup } from '@angular/forms';
import { jsonCopy } from 'submodules/javascript-functions/general';
import { getColorForDataType } from 'src/app/util/helper-functions';
import { dataTypes } from 'src/app/util/data-types';

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
  @Input() useableNonTextAttributes: Attribute[];
  @Input() loadingEmbeddingsDict: boolean;

  @ViewChild('gdprText') gdprText: ElementRef;
  downloadedModels: DownloadedModel[] = [];
  subscriptions$: Subscription[] = [];
  somethingLoading: boolean = false;
  downloadedModelsQuery$: any;
  embeddingHandlesCopy: { [embeddingId: string]: any };;
  selectedPlatform: EmbeddingPlatform;
  organization: Organization;
  isCreationOfEmbeddingDisabled: boolean = false;
  granularityArray = granularityTypesArray;
  embeddingPlatformsCopy: EmbeddingPlatform[];
  gdprTextHTML: string;
  dataTypesArray = dataTypes;
  showEditOption: boolean = true;
  azureUrls: string[] = [];
  azureEngines: string[] = [];
  azureVersions: string[] = [];

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
      whitelist: ['model_provider_download', 'gdpr_compliant'],
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
    this.embeddingPlatformsCopy = jsonCopy(this.embeddingPlatforms);
    if (this.organization.gdprCompliant) {
      this.embeddingPlatforms = this.embeddingPlatforms.filter((platform) => platform.terms == null);
    }
    const embeddingPlatformsNew = [];
    this.embeddingPlatforms.forEach((platform: EmbeddingPlatform) => {
      platform = { ...platform, name: platformNamesDict[platform.platform] };
      if (platform.terms != null) {
        platform.splitTerms = platform.terms.split('@@PLACEHOLDER@@');
        platform.splitTerms[1] = platform.splitTerms[1].substring(1);
      }
      embeddingPlatformsNew.push(platform);
    });
    this.embeddingPlatforms = embeddingPlatformsNew;
  }

  checkForceHiddenHandles() {
    const form = this.settingModals.embedding.create.embeddingCreationFormGroup;
    const platformValue = form.get('platform').value;
    this.prepareSuggestions(form);
    if (form.get('model').value != null) {
      form.get('model').setValue(null);
    }
    this.initEmbeddingModal(false, platformValue);
    this.selectedPlatform = this.embeddingPlatforms.find((p: EmbeddingPlatform) => p.platform == platformValue);
    if (platformValue == PlatformType.OPEN_AI || platformValue == PlatformType.COHERE || platformValue == PlatformType.AZURE) {
      form.get('granularity').setValue(EmbeddingType.ON_ATTRIBUTE);
      if (platformValue == PlatformType.AZURE) {
        const azureUrls = localStorage.getItem('azureUrls');
        if (azureUrls) {
          this.azureUrls = JSON.parse(azureUrls);
        }
        const azureVersions = localStorage.getItem('azureVersions');
        if (azureVersions) {
          this.azureVersions = JSON.parse(azureVersions);
        }
        const azureEngines = localStorage.getItem('azureEngines');
        if (azureEngines) {
          this.azureEngines = JSON.parse(azureEngines);
        }
      }
    }
    this.checkIfPlatformHasToken();
    this.checkIfCreateEmbeddingIsDisabled();
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
    this.checkModelDownloaded();
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
      termsText: this.gdprText ? this.gdprText.nativeElement.innerHTML : null,
      termsAccepted: embeddingForm.get("termsAccepted").value,
      embeddingType: embeddingForm.get("granularity").value.substring(3) === "TOKEN" ? EmbeddingType.ON_TOKEN : EmbeddingType.ON_ATTRIBUTE,
      filterAttributes: embeddingForm.get("filterAttributes").value.filter((a) => a.active && a.id !== 'SELECT_ALL').map((a) => a.name)
    }

    if (platform == PlatformType.HUGGING_FACE || platform == PlatformType.PYTHON) {
      config.model = embeddingForm.get("model").value;
    } else if (platform == PlatformType.OPEN_AI) {
      config.model = embeddingForm.get("model").value;
      config.apiToken = embeddingForm.get("apiToken").value;
    } else if (platform == PlatformType.COHERE) {
      config.apiToken = embeddingForm.get("apiToken").value;
    } else if (platform == PlatformType.AZURE) {
      config.model = embeddingForm.get("engine").value; //note that is handled internally as model so we use the model field for the request
      config.apiToken = embeddingForm.get("apiToken").value;
      config.base = embeddingForm.get("base").value;
      config.type = DEFAULT_AZURE_TYPE;
      config.version = embeddingForm.get("version").value;
      this.prepareAzureData(embeddingForm);
    }

    this.projectApolloService.createEmbedding(
      this.project.id,
      attributeId,
      JSON.stringify(config)
    ).pipe(first()).subscribe(() => {
      this.resetEmbeddingCreationAndPlatform();
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
    this.somethingLoading = this.useableAttributes == undefined || this.useableAttributes?.length == 0 || this.embeddingHandles == undefined || (this.isManaged && !this.downloadedModels);
  }

  handleWebsocketNotification(msgParts) {
    if (msgParts[1] === 'model_provider_download' && msgParts[2] === 'finished') {
      timer(2500).subscribe(() => this.downloadedModelsQuery$.refetch());
    } else if (msgParts[1] === 'gdpr_compliant') {
      if (msgParts[2].toLowerCase() === 'true') {
        this.embeddingPlatforms = this.embeddingPlatforms.filter(platform => platform.terms == null);
      } else {
        this.embeddingPlatforms = this.embeddingPlatformsCopy;
        this.embeddingPlatforms.forEach((platform: EmbeddingPlatform) => {
          platform.name = platformNamesDict[platform.platform];
          if (platform.terms != null) {
            platform.splitTerms = platform.terms.split('@@PLACEHOLDER@@');
            platform.splitTerms[1] = platform.splitTerms[1].substring(1);
          }
        });
      }
      this.resetEmbeddingCreationAndPlatform();
    }
  }

  checkIfCreateEmbeddingIsDisabled() {
    const embeddingForm = this.settingModals.embedding.create.embeddingCreationFormGroup;
    const platform = embeddingForm.get("platform").value;
    const model = embeddingForm.get("model").value;
    const apiToken = embeddingForm.get("apiToken").value;
    const termsAccepted = embeddingForm.get("termsAccepted").value;
    const base = embeddingForm.get("base").value;
    const version = embeddingForm.get("version").value;
    const engine = embeddingForm.get("engine").value;
    let checkFormFields: boolean = false;

    if (platform == PlatformType.HUGGING_FACE || platform == PlatformType.PYTHON) {
      checkFormFields = model == null;
    } else if (platform == PlatformType.OPEN_AI) {
      checkFormFields = model == null || apiToken == null || apiToken == "" || !termsAccepted;
    } else if (platform == PlatformType.COHERE) {
      checkFormFields = apiToken == null || apiToken == "" || !termsAccepted;
    } else if (platform == PlatformType.AZURE) {
      checkFormFields = apiToken == null || apiToken == "" || base == null || base == "" || version == null || version == "" || !termsAccepted || !engine;
    }
    const checkDuplicates = this.dataHandlerHelper.canCreateEmbedding(this.settingModals, this.embeddings, this.attributes);
    this.isCreationOfEmbeddingDisabled = this.settingModals.embedding.create.blocked ||
      !(this.useableTextAttributes && this.settingModals.embedding.create.embeddingCreationFormGroup) || checkFormFields || !checkDuplicates;
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
      form.get("base").setValue(null);
      form.get("version").setValue(null);
      form.get("engine").setValue(null);
    }
  }

  closeModal() {
    this.settingModals.embedding.create.open = false;
    this.settingModals.embedding.create.embeddingCreationFormGroup.get('termsAccepted').setValue(null);
  }

  checkIfPlatformHasToken() {
    if (this.selectedPlatform.platform == PlatformType.COHERE || this.selectedPlatform.platform == PlatformType.OPEN_AI || this.selectedPlatform.platform == PlatformType.AZURE) {
      this.granularityArray = this.granularityArray.filter((g) => g.value != EmbeddingType.ON_TOKEN);
    } else {
      this.granularityArray = this.dataHandlerHelper.granularityTypesArray;
    }
  }

  resetEmbeddingCreationAndPlatform() {
    this.initEmbeddingModal();
    this.selectedPlatform = this.embeddingPlatforms[0];
    this.prepareSuggestions(this.settingModals.embedding.create.embeddingCreationFormGroup);
    this.checkIfPlatformHasToken();
  }

  toggleActiveGroup(group: FormGroup) {
    if (group.disabled) return;
    const formControls = this.settingModals.embedding.create.embeddingCreationFormGroup.get('filterAttributes')['controls'];
    if (group.get('id').value == 'SELECT_ALL') {
      for (let control of formControls) {
        control.get('active').setValue(!group.get('active').value);
      }
    } else {
      group.get('active').setValue(!group.get('active').value);
      let atLeastOneActive = false;
      for (let control of formControls) {
        if (control.get('active').value) {
          atLeastOneActive = true;
          break;
        }
      }
      if (atLeastOneActive) formControls[formControls.length - 1].get('active').setValue(false);
    }
  }

  prepareAttributeDataByNames(attributesNames: string[]) {
    if (!attributesNames) return [];
    const attributes = [];
    for (let name of attributesNames) {
      const attribute = this.attributes.find((a) => a.name == name);
      attribute.color = getColorForDataType(attribute.dataType);
      attribute.dataTypeName = this.dataTypesArray.find((type) => type.value === attribute.dataType).name;
      attributes.push(attribute);
    }
    return attributes;
  }

  toggleEditOption() {
    if (this.showEditOption) {
      const formControls = this.settingModals.embedding.create.embeddingCreationFormGroup.get('filterAttributes')['controls'];
      for (let attribute of this.settingModals.embedding.filteredAttributes.attributeNames) {
        const control = formControls.find((c) => c.get('name').value == attribute.name);
        if (control) control.get('active').setValue(true);
      }
    }
    this.showEditOption = !this.showEditOption;
  }

  saveFilteredAttributes() {
    const form = this.settingModals.embedding.create.embeddingCreationFormGroup.get("filterAttributes").value;
    const filterAttributes = form.filter((a) => a.active && a.id !== 'SELECT_ALL').map((a) => a.name)
    this.projectApolloService.updateEmbeddingPayload(
      this.project.id,
      this.settingModals.embedding.filteredAttributes.saveEmbeddingId,
      JSON.stringify(filterAttributes)
    ).pipe(first()).subscribe(() => { });
  }

  optionClicked(button: string) {
    if (button == 'CLOSE') {
      this.settingModals.embedding.filteredAttributes.open = false;
      this.showEditOption = true;
    }
    else if (button == 'ACCEPT') {
      this.saveFilteredAttributes();
      this.settingModals.embedding.filteredAttributes.open = false;
      this.showEditOption = true;
    } else if (button === 'EDIT') {
      this.toggleEditOption();
    }
  }

  prepareAzureData(form: FormGroup) {
    const getAzureUrl = localStorage.getItem('azureUrls');
    const getAzureVersion = localStorage.getItem('azureVersions');
    const getAzureEngine = localStorage.getItem('azureEngines');
    const baseValue = form.get('base').value;
    const versionValue = form.get('version').value;
    const engineValue = form.get('engine').value;
    if (getAzureUrl == undefined || !this.azureUrls.includes(baseValue)) {
      this.azureUrls.push(baseValue);
      localStorage.setItem('azureUrls', JSON.stringify(this.azureUrls));
    }
    if (getAzureVersion == undefined || !this.azureVersions.includes(versionValue)) {
      this.azureVersions.push(versionValue);
      localStorage.setItem('azureVersions', JSON.stringify(this.azureVersions));
    }

    if (getAzureEngine == undefined || !this.azureEngines.includes(engineValue)) {
      this.azureEngines.push(engineValue);
      localStorage.setItem('azureEngines', JSON.stringify(this.azureEngines));
    }

  }

  checkEmbeddingProperty(eventTarget: HTMLInputElement, property: string) {
    const embeddingForm = this.settingModals.embedding.create.embeddingCreationFormGroup;
    embeddingForm.get(property).setValue(eventTarget.value);
    this.checkIfCreateEmbeddingIsDisabled();
  }

  selectEmbeddingProperty(base: any, inputElement: HTMLInputElement, property: string) {
    inputElement.value = base;
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    this.checkEmbeddingProperty(inputElement, property);
  }
}
