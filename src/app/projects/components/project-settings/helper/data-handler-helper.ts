import { FormArray, FormBuilder, FormGroup } from "@angular/forms";
import { interval, Subscription, timer } from "rxjs";
import { debounceTime, first } from "rxjs/operators";
import { ProjectApolloService } from "src/app/base/services/project/project-apollo.service";
import { attributeVisibilityStates } from "../../create-new-attribute/attributes-visibility-helper";
import { Attribute } from "../entities/attribute.type";
import { Embedding } from "../entities/embedding.type";
import { SettingModals } from "./modal-helper";

export class DataHandlerHelper {

    attributesSchema: FormGroup;
    get attributesArray() {
        return this.attributesSchema.get('attributes') as FormArray;
    }
    subscriptions$: Subscription[] = [];
    attributeVisibilityStates = attributeVisibilityStates;
    attributes: any[] = [];
    pKeyCheckTimer: any;
    granularityTypesArray = [
        { name: 'Attribute', value: 'ON_ATTRIBUTE' },
        { name: 'Token', value: 'ON_TOKEN' }
    ];

    constructor(private formBuilder: FormBuilder, private projectApolloService: ProjectApolloService) {
        this.attributesSchema = this.formBuilder.group({
            attributes: this.formBuilder.array([]),
        });
    }

    focusModalInputBox(inputBoxName: string) {
        const input = document.getElementById(inputBoxName) as HTMLInputElement;
        if (input && input instanceof HTMLElement) {
            setTimeout(() => {
                input.focus();
            }, 0);
            return;
        }
    }

    getAttributeArrayAttribute(attributeId: string, valueID: string) {
        for (let att of this.attributesArray.controls) {
            if (attributeId == att.get('id').value) return att.get(valueID).value;
        }
        return 'UNKNOWN';
    }

    prepareAttributesRequest(projectId: string): any {
        return this.projectApolloService.getAttributesByProjectId(projectId, ['ALL']);
    }

    attributeChangedToText(): boolean {
        for (let i = 0; i < this.attributes.length; i++) {
            const att = this.attributes[i]
            const wantedDataType = this.getAttributeArrayAttribute(att.id, 'dataType');
            if (att.dataType != wantedDataType && wantedDataType == "TEXT") return true;
        }
        return false;
    }

    requestPKeyCheck(attributes: Attribute[], primaryKey: boolean): any {
        let pKeyValid: boolean = primaryKey;
        if (this.pKeyCheckTimer) this.pKeyCheckTimer.unsubscribe();
        this.pKeyCheckTimer = timer(500).subscribe(() => {
            this.pKeyCheckTimer = null;
            if (this.anyPKey(attributes)) {
                pKeyValid = primaryKey;
            }
            else pKeyValid = null;
            return pKeyValid;
        });
        return pKeyValid;
    }

    createAttributeTokenStatistics(projectId: string, attributeId: string) {
        this.projectApolloService.createAttributeTokenStatistics(projectId, attributeId).pipe(first()).subscribe();
    }

    anyPKey(attributes: Attribute[]): boolean {
        if (!attributes) return false;
        for (let i = 0; i < attributes.length; i++) {
            const att = attributes[i];
            if (att.isPrimaryKey) return true;
        }
        return false;
    }

    prepareEmbeddingFormGroup(attributes: Attribute[], settingModals: SettingModals, embeddings: Embedding[]) {
        if (attributes.length > 0) {
            settingModals.embedding.create.embeddingCreationFormGroup = this.formBuilder.group({
                targetAttribute: attributes[0].id,
                embeddingHandle: "",
                granularity: this.granularityTypesArray[0].value
            });
            settingModals.embedding.create.embeddingCreationFormGroup.valueChanges.pipe(debounceTime(200)).subscribe(() =>
                settingModals.embedding.create.blocked = !this.canCreateEmbedding(settingModals, embeddings)
            )
        }
    }

    buildExpectedEmbeddingName(settingModals: SettingModals): string {
        const values = settingModals.embedding.create.embeddingCreationFormGroup.getRawValue();
        let toReturn = this.getAttributeArrayAttribute(values.targetAttribute, 'name');
        toReturn += "-" + (values.granularity == 'ON_ATTRIBUTE' ? 'classification' : 'extraction');
        toReturn += "-" + values.embeddingHandle;

        return toReturn;
    }

    canCreateEmbedding(settingModals: SettingModals, embeddings: any): boolean {
        const currentName = this.buildExpectedEmbeddingName(settingModals);
        if (currentName.slice(-1) == "-") return false;
        else {
            settingModals.embedding.create.blocked = true;
            for (const embedding of embeddings) {
                if (embedding.name == currentName) return false;
            }
        }
        return true;
    }

    prepareEmbeddingHandles(projectId: string, attributes: any, tokenizer: string, encoderSuggestions: any): any {
        let embeddingHandlesMap: { [key: string]: any } = {};
        if (!projectId) {
            let timer = interval(250).subscribe(() => {
                if (!projectId) {
                    embeddingHandlesMap = this.parseEncoderToSuggestions(encoderSuggestions, attributes, tokenizer);
                    timer.unsubscribe();
                }
            });
        } else {
            embeddingHandlesMap = this.parseEncoderToSuggestions(encoderSuggestions, attributes, tokenizer);
        }
        return embeddingHandlesMap;
    }

    private parseEncoderToSuggestions(encoderSuggestions: any, attributes: Attribute[], tokenizer: string): any {
        let embeddingHandlesMap: { [key: string]: any } = {}
        encoderSuggestions = encoderSuggestions.filter(e => e.tokenizers.includes("all") || e.tokenizers.includes(tokenizer))
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
            embeddingHandlesMap[att.id] = encoderSuggestions;
        });
        return embeddingHandlesMap;
    }

    prepareEmbeddingsRequest(projectId: string) {
        return this.projectApolloService.getEmbeddingSchema(projectId);
    }

}