import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { interval, Observable, Subscription } from 'rxjs';
import { debounceTime, first } from 'rxjs/operators';
import { Project } from 'src/app/base/entities/project';
import { ProjectApolloService } from 'src/app/base/services/project/project-apollo.service';
import { WeakSourceApolloService } from 'src/app/base/services/weak-source/weak-source-apollo.service';
import { DataHandlerHelper } from '../../helper/data-handler-helper';
import { SettingModals } from '../../helper/modal-helper';

@Component({
  selector: 'kern-embeddings',
  templateUrl: './embeddings.component.html',
  styleUrls: ['./embeddings.component.scss'],
})
export class EmbeddingsComponent implements OnInit {

  @Input() project: Project;
  @Input() settingModals: SettingModals;
  @Input() isManaged: boolean;
  subscriptions$: Subscription[] = [];
  embeddingHandlesMap: Map<string, any> = new Map<string, any>();
  attributesArrayTextUsableUploaded: { id: string, name: string }[] = [];

  embeddingQuery$: any;
  embeddings: any;

  downloadedModelsList$: any;
  downloadedModelsQuery$: any;
  downloadedModels: any[];

  granularityTypesArray = [
    { name: 'Attribute', value: 'ON_ATTRIBUTE' },
    { name: 'Token', value: 'ON_TOKEN' }
  ];
  dataHandlerHelper: DataHandlerHelper;
  attributesArray: any;

  constructor(private projectApolloService: ProjectApolloService, private formBuilder: FormBuilder) {
    this.dataHandlerHelper = new DataHandlerHelper(this.formBuilder);
    this.attributesArray = this.dataHandlerHelper.attributesArray;
    this.attributesArrayTextUsableUploaded = this.dataHandlerHelper.attributesArrayTextUsableUploaded;
  }

  ngOnInit(): void {
    this.prepareEmbeddingsRequest(this.project.id);
    console.log("ATTT", this.attributesArrayTextUsableUploaded)
  }

  prepareEmbeddingsRequest(projectId: string) {
    let embeddings$;
    [this.embeddingQuery$, embeddings$] = this.projectApolloService.getEmbeddingSchema(projectId);

    this.subscriptions$.push(embeddings$.subscribe((embeddings) => {
      this.embeddings = embeddings
      console.log(this.embeddings)
    }));
    return embeddings$;
  }

  prepareEmbeddingFormGroup(attributes, attributesArrayTextUsableUploaded) {
    this.attributesArrayTextUsableUploaded = attributesArrayTextUsableUploaded;
    if (attributes.length > 0) {
      this.settingModals.embedding.create.embeddingCreationFormGroup = this.formBuilder.group({
        targetAttribute: attributes[0].id,
        embeddingHandle: "",
        granularity: this.granularityTypesArray[0].value
      });
      this.settingModals.embedding.create.embeddingCreationFormGroup.valueChanges.pipe(debounceTime(200)).subscribe(() =>
        this.settingModals.embedding.create.blocked = !this.canCreateEmbedding()
      )
    }
  }

  prepareDownloadedModels() {
    [this.downloadedModelsQuery$, this.downloadedModelsList$] = this.projectApolloService.getModelProviderInfo();
    this.subscriptions$.push(
      this.downloadedModelsList$.subscribe((downloadedModels) => this.downloadedModels = downloadedModels));

  }

  buildExpectedEmbeddingName(): string {
    const values = this.settingModals.embedding.create.embeddingCreationFormGroup.getRawValue();
    let toReturn = this.dataHandlerHelper.getAttributeArrayAttribute(values.targetAttribute, 'name');
    toReturn += "-" + (values.granularity == 'ON_ATTRIBUTE' ? 'classification' : 'extraction');
    toReturn += "-" + values.embeddingHandle;

    return toReturn;
  }

  canCreateEmbedding(): boolean {
    const currentName = this.buildExpectedEmbeddingName();
    if (currentName.slice(-1) == "-") return false;
    else {
      this.settingModals.embedding.create.blocked = true;
      console.log(this.embeddings)
      for (const embedding of this.embeddings) {
        if (embedding.name == currentName) return false;
      }
    }
    return true;
  }

  prepareEmbeddingHandles(projectId: string, attributes) {
    this.projectApolloService.getRecommendedEncodersForEmbeddings(projectId).pipe(first()).subscribe((encoderSuggestions) => {
      if (!this.project) {
        let timer = interval(250).subscribe(() => {
          if (!this.project) {
            this.parseEncoderToSuggestions(encoderSuggestions, attributes);
            timer.unsubscribe();
          }
        });
      } else {
        this.parseEncoderToSuggestions(encoderSuggestions, attributes);
      }
    })
  }

  private parseEncoderToSuggestions(encoderSuggestions, attributes) {
    console.log("encoder", encoderSuggestions)
    encoderSuggestions = encoderSuggestions.filter(e => e.tokenizers.includes("all") || e.tokenizers.includes(this.project.tokenizer))
    if (!encoderSuggestions.length) return;
    if (encoderSuggestions) encoderSuggestions.forEach(element => {
      element = { ...element };
      element.hidden = false;
      element.forceHidden = false;
      if (typeof element.applicability === 'string' || element.applicability instanceof String) {
        element.applicability = JSON.parse(element.applicability);
      }
    });
    attributes.forEach(att => {
      this.embeddingHandlesMap.set(att.id, encoderSuggestions);
    })
    console.log("Map", this.embeddingHandlesMap)
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
        this.settingModals.embedding.create.blocked = !this.canCreateEmbedding();
      });
  }

  addEmbedding() {
    if (!this.canCreateEmbedding()) return;
    const embeddingForm = this.settingModals.embedding.create.embeddingCreationFormGroup;
    const embeddingHandle = embeddingForm.get("embeddingHandle").value;
    const attributeId = embeddingForm.get("targetAttribute").value;
    const granularity = embeddingForm.get("granularity").value;

    this.projectApolloService.createEmbedding(this.project.id, attributeId, embeddingHandle, granularity.substring(3)).pipe(first()).subscribe();
  }

  selectFirstUnhiddenEmbeddingHandle(inputElement: HTMLInputElement) {
    console.log("hidden", inputElement)
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
    console.log(embeddingForm)
    embeddingForm.get('embeddingHandle').setValue(eventTarget.value);
    const suggestionList = this.embeddingHandlesMap.get(embeddingForm.get("targetAttribute").value);
    console.log(suggestionList)
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
