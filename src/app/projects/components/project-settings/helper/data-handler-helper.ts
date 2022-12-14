import { FormArray, FormBuilder, FormGroup } from "@angular/forms";

export class DataHandlerHelper {

    attributesArrayUsableUploaded: { id: string, name: string }[] = [];
    attributesArrayTextUsableUploaded: { id: string, name: string }[] = [];
    attributesSchema: FormGroup;
    granularityTypesArray: any[] = [];
    get attributesArray() {
        return this.attributesSchema.get('attributes') as FormArray;
    }

    constructor(private formBuilder: FormBuilder) {
        this.attributesSchema = this.formBuilder.group({
            attributes: this.formBuilder.array([]),
        });
    }

    public focusModalInputBox(inputBoxName: string) {
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
}