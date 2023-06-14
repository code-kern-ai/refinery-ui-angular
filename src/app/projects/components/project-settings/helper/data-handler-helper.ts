import { FormBuilder } from "@angular/forms";
import { interval, timer } from "rxjs";
import { debounceTime, first } from "rxjs/operators";
import { ProjectApolloService } from "src/app/base/services/project/project-apollo.service";
import { Attribute } from "../entities/attribute.type";
import { Embedding, EmbeddingPlatform } from "../entities/embedding.type";
import { SettingModals } from "./modal-helper";
import { EmbeddingType, PlatformType, granularityTypesArray } from "./project-settings-helper";

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

    getAttributeArrayAttribute(attributeId: string, valueKey: string, attributes: Attribute[]) {
        for (let i = 0; i < attributes.length; i++) {
            const att = attributes[i];
            if (attributeId == att.id) return att[valueKey];
        }
        return 'UNKNOWN';
    }

    prepareAttributesRequest(projectId: string): any {
        return this.projectApolloService.getAttributesByProjectId(projectId, ['ALL']);
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

    prepareEmbeddingFormGroup(attributes: Attribute[], settingModals: SettingModals, embeddings: Embedding[], embeddingPlatforms: EmbeddingPlatform[]) {
        if (attributes.length > 0) {
            settingModals.embedding.create.embeddingCreationFormGroup = this.formBuilder.group({
                targetAttribute: attributes[0].id,
                model: null,
                platform: embeddingPlatforms[0].platform,
                granularity: this.granularityTypesArray[0].value,
                apiToken: null,
                termsAccepted: false
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
        const platform = settingModals.embedding.create.embeddingCreationFormGroup.get('platform').value;
        if (platform == PlatformType.HUGGING_FACE || platform == PlatformType.PYTHON) {
            toReturn += "-" + platform + "-" + values.model;
        } else if (platform == PlatformType.OPEN_AI || platform == PlatformType.COHERE) {
            toReturn += this.buildEmbeddingNameWithApiToken(values, platform);
        }
        return toReturn;
    }

    buildEmbeddingNameWithApiToken(values: any, platform: string) {
        if (values.apiToken == null) return "";
        let toReturn = "";
        const apiTokenCut = values.apiToken.substring(0, 3) + "..." + values.apiToken.substring(values.apiToken.length - 4, values.apiToken.length);
        toReturn += `-${platform}-${platform == PlatformType.OPEN_AI ? values.model + "-" + apiTokenCut : apiTokenCut}`;
        return toReturn;
    }

    canCreateEmbedding(settingModals: SettingModals, embeddings: any, attributes: Attribute[]): boolean {
        const currentName = this.buildExpectedEmbeddingName(settingModals, attributes);
        settingModals.embedding.create.blocked = true;
        if (currentName.slice(-1) == "-") return false;
        else {
            settingModals.embedding.create.blocked = true;
            for (const embedding of embeddings) {
                if (embedding.name == currentName) return false;
            }
        }
        settingModals.embedding.create.blocked = false;
        return true;
    }

    prepareEmbeddingHandles(projectId: string, attributes: any, tokenizer: string, encoderSuggestions: any): any {
        let embeddingHandles: { [embeddingId: string]: any } = {};
        if (!projectId) {
            let timer = interval(250).subscribe(() => {
                if (!projectId) {
                    embeddingHandles = this.parseEncoderToSuggestions(encoderSuggestions, attributes, tokenizer);
                    timer.unsubscribe();
                }
            });
        } else {
            embeddingHandles = this.parseEncoderToSuggestions(encoderSuggestions, attributes, tokenizer);
        }
        return embeddingHandles;
    }

    private parseEncoderToSuggestions(encoderSuggestions: any, attributes: Attribute[], tokenizer: string): any {
        let embeddingHandles: { [embeddingId: string]: any } = {}
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
            embeddingHandles[att.id] = encoderSuggestions;
        });
        return embeddingHandles;
    }

    prepareEmbeddingsRequest(projectId: string) {
        return this.projectApolloService.getEmbeddingSchema(projectId);
    }

    extendQueuedEmbeddings(projectId: string, embeddings: any[]) {
        this.projectApolloService.getQueuedTasks(projectId, "EMBEDDING").pipe(first()).subscribe((r) => {
            r.forEach((task) => {
                embeddings.push({
                    id: task.id,
                    name: task.taskInfo["embedding_name"],
                    custom: false,
                    type: task.taskInfo["type"] == EmbeddingType.ON_ATTRIBUTE ? EmbeddingType.ON_ATTRIBUTE : EmbeddingType.ON_TOKEN,
                    state: "QUEUED",
                    progress: 0,
                    dimension: 0,
                    count: 0
                });
            });
        })
    }

}