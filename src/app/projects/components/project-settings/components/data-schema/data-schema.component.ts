import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Observable, Subscription, timer } from 'rxjs';
import { distinctUntilChanged, first } from 'rxjs/operators';
import { Project } from 'src/app/base/entities/project';
import { ProjectApolloService } from 'src/app/base/services/project/project-apollo.service';
import { WeakSourceApolloService } from 'src/app/base/services/weak-source/weak-source-apollo.service';
import { attributeVisibilityStates, getTooltipVisibilityState } from '../../../create-new-attribute/attributes-visibility-helper';
import { DataHandlerHelper } from '../../helper/data-handler-helper';
import { SettingModals } from '../../helper/modal-helper';
import { EmbeddingsComponent } from '../embeddings/embeddings.component';

@Component({
  selector: 'kern-data-schema',
  templateUrl: './data-schema.component.html',
  styleUrls: ['./data-schema.component.scss']
})
export class DataSchemaComponent implements OnInit {

  @Input() project: Project;
  @Input() settingModals: SettingModals;
  @Input() dataTypesArray: any;
  subscriptions$: Subscription[] = [];

  attributesQuery$: any;
  attributesSchema: FormGroup;
  attributesArray: any;
  attributeVisibilityStates = attributeVisibilityStates;
  tooltipsArray: string[] = [];
  pKeyValid: boolean = null;
  pKeyCheckTimer: any;
  attributes: any;

  // get attributesArray() {
  //   return this.attributesSchema.get('attributes') as FormArray;
  // }
  attributesArrayTextUsableUploaded: { id: string, name: string }[] = [];
  dataHandlerHelper: DataHandlerHelper;
  embeddingsComponent: EmbeddingsComponent;

  constructor(private formBuilder: FormBuilder, private projectApolloService: ProjectApolloService, private informationSourceApolloService: WeakSourceApolloService) {
    this.dataHandlerHelper = new DataHandlerHelper(this.formBuilder);
    this.attributesSchema = this.dataHandlerHelper.attributesSchema
    this.attributesArray = this.dataHandlerHelper.attributesArray;
    this.embeddingsComponent = new EmbeddingsComponent(this.projectApolloService, this.formBuilder);
  }

  ngOnInit(): void {
    this.prepareAttributesRequest(this.project.id);
    this.requestPKeyCheck(this.project.id);
  }

  prepareAttributesRequest(projectId: string): Observable<any> {
    let attributes$;
    [this.attributesQuery$, attributes$] = this.projectApolloService.getAttributesByProjectId(projectId, ['ALL']);
    this.subscriptions$.push(attributes$.subscribe((attributes) => {
      this.attributes = attributes;
      this.attributesArrayTextUsableUploaded = [];
      this.dataHandlerHelper.attributesArrayUsableUploaded = [];
      this.dataHandlerHelper.attributesArray.clear();
      console.log(attributes)
      attributes.forEach((att) => {
        let group = this.formBuilder.group({
          id: att.id,
          name: att.name,
          dataType: att.dataType,
          isPrimaryKey: att.isPrimaryKey,
          userCreated: att.userCreated,
          sourceCode: att.sourceCode,
          state: att.state,
          dataTypeName: this.dataTypesArray.find((type) => type.value === att?.dataType).name,
          visibilityIndex: this.attributeVisibilityStates.findIndex((type) => type.value === att?.visibility),
        });

        if (att.state == 'INITIAL' || att.state == 'FAILED') {
          group.get('isPrimaryKey').disable();
        }

        group.valueChanges.pipe(distinctUntilChanged()).subscribe(() => {
          let values = group.getRawValue(); //to ensure disabled will be returned as well      
          if (this.pKeyChanged()) this.requestPKeyCheck(this.project.id);
          if (this.attributeChangedToText()) this.createAttributeTokenStatistics(this.project.id, values.id);
          const visibility = this.attributeVisibilityStates[values.visibilityIndex].value;
          this.projectApolloService.
            updateAttribute(this.project.id, values.id, values.dataType, values.isPrimaryKey, values.name, values.sourceCode, visibility).pipe(first()).subscribe();
        });
        this.dataHandlerHelper.attributesArray.push(group);
        console.log("state", att.state)
        if (att.state == 'UPLOADED' || att.state == 'USABLE' || att.state == 'AUTOMATICALLY_CREATED') {
          if (att.dataType == 'TEXT') {
            this.dataHandlerHelper.attributesArrayTextUsableUploaded.push({ id: att.id, name: att.name });
            this.dataHandlerHelper.attributesArrayUsableUploaded.push({ id: att.id, name: att.name });
          } else {
            this.dataHandlerHelper.attributesArrayUsableUploaded.push({ id: att.id, name: att.name });
          }
        }
      });


      const onlyTextAttributes = attributes.filter(a => a.dataType == 'TEXT');
      this.embeddingsComponent.settingModals = this.settingModals;
      this.embeddingsComponent.project = this.project;
      this.embeddingsComponent.prepareEmbeddingFormGroup(onlyTextAttributes, this.attributesArrayTextUsableUploaded);
      this.embeddingsComponent.prepareEmbeddingHandles(projectId, onlyTextAttributes);
      this.tooltipsArray = [];
      this.attributeVisibilityStates.forEach((state) => {
        this.tooltipsArray.push(getTooltipVisibilityState(state.value));
      });
    }));
    return attributes$;
  }

  requestPKeyCheck(projectId: string) {
    this.pKeyValid = null;
    if (this.pKeyCheckTimer) this.pKeyCheckTimer.unsubscribe();
    this.pKeyCheckTimer = timer(500).subscribe(() => {
      this.projectApolloService.getCompositeKeyIsValid(projectId).pipe(first()).subscribe((r) => {
        this.pKeyCheckTimer = null;
        if (this.anyPKey()) this.pKeyValid = r;
        else this.pKeyValid = null;
      })
    });
  }

  createAttributeTokenStatistics(projectId: string, attributeId: string) {
    this.projectApolloService.createAttributeTokenStatistics(projectId, attributeId).pipe(first()).subscribe();
  }

  anyPKey(): boolean {
    if (!this.attributes) return false;
    for (let i = 0; i < this.attributes.length; i++) {
      const att = this.attributes[i]
      if (att.isPrimaryKey) return true;
    }
    return false;
  }

  pKeyChanged(): boolean {
    for (let i = 0; i < this.attributes.length; i++) {
      const att = this.attributes[i]
      if (att.isPrimaryKey != this.dataHandlerHelper.getAttributeArrayAttribute(att.id, 'isPrimaryKey')) return true;
    }
    return false;
  }


  attributeChangedToText(): boolean {
    for (let i = 0; i < this.attributes.length; i++) {
      const att = this.attributes[i]
      const wantedDataType = this.dataHandlerHelper.getAttributeArrayAttribute(att.id, 'dataType');
      if (att.dataType != wantedDataType && wantedDataType == "TEXT") return true;
    }
    return false;
  }


}
