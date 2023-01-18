import { FormBuilder } from "@angular/forms";
import { interval, timer } from "rxjs";
import { debounceTime, first } from "rxjs/operators";
import { ProjectApolloService } from "src/app/base/services/project/project-apollo.service";
import { Attribute } from "../entities/attribute.type";
import { Embedding } from "../entities/embedding.type";
import { SettingModals } from "./modal-helper";
import { granularityTypesArray } from "./project-settings-helper";

export class DataHandlerHelper {

    granularityTypesArray = granularityTypesArray;
    pKeyValid: boolean = null;
    pKeyCheckTimer: any;

    constructor(private formBuilder: FormBuilder, private projectApolloService: ProjectApolloService) {
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

    getAttributeArrayAttribute(attributeId: string, valueID: string, attributes: Attribute[]) {
        for (let i = 0; i < attributes.length; i++) {
            const att = attributes[i];
            if (attributeId == att.id) return att[valueID];
        }
        return 'UNKNOWN';
    }

    prepareAttributesRequest(projectId: string): any {
        return this.projectApolloService.getAttributesByProjectId(projectId, ['ALL']);
    }

    attributeChangedToText(attributes: Attribute[]): boolean {
        for (let i = 0; i < attributes.length; i++) {
            const att = attributes[i]
            const wantedDataType = this.getAttributeArrayAttribute(att.id, 'dataType', attributes);
            if (att.dataType != wantedDataType && wantedDataType == "TEXT") return true;
        }
        return false;
    }

    createAttributeTokenStatistics(projectId: string, attributeId: string) {
        this.projectApolloService.createAttributeTokenStatistics(projectId, attributeId).pipe(first()).subscribe();
    }

    requestPKeyCheck(projectId: string, attributes: Attribute[]) {
        this.pKeyValid = null;
        if (this.pKeyCheckTimer) this.pKeyCheckTimer.unsubscribe();
        this.pKeyCheckTimer = timer(500).subscribe(() => {
            this.projectApolloService.getCompositeKeyIsValid(projectId).pipe(first()).subscribe((r) => {
                this.pKeyCheckTimer = null;
                if (this.anyPKey(attributes)) this.pKeyValid = r;
                else this.pKeyValid = null;
            })
        });
    }

    anyPKey(attributes: Attribute[]): boolean {
        if (!attributes) return false;
        for (let i = 0; i < attributes.length; i++) {
            const att = attributes[i]
            if (att.isPrimaryKey) return true;
        }
        return false;
    }

    pKeyChanged(attributes: Attribute[]): boolean {
        for (let i = 0; i < attributes.length; i++) {
            const att = attributes[i]
            if (att.isPrimaryKey != this.getAttributeArrayAttribute(att.id, 'isPrimaryKey', attributes)) return true;
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
                settingModals.embedding.create.blocked = !this.canCreateEmbedding(settingModals, embeddings, attributes)
            )
        }
    }

    buildExpectedEmbeddingName(settingModals: SettingModals, attributes: Attribute[]): string {
        const values = settingModals.embedding.create.embeddingCreationFormGroup.getRawValue();
        let toReturn = this.getAttributeArrayAttribute(values.targetAttribute, 'name', attributes);
        toReturn += "-" + (values.granularity == 'ON_ATTRIBUTE' ? 'classification' : 'extraction');
        toReturn += "-" + values.embeddingHandle;

        return toReturn;
    }

    canCreateEmbedding(settingModals: SettingModals, embeddings: any, attributes: Attribute[]): boolean {
        const currentName = this.buildExpectedEmbeddingName(settingModals, attributes);
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