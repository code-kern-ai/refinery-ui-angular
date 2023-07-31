import { ProjectApolloService } from "src/app/base/services/project/project-apollo.service";
import { DataBrowserComponent } from "../data-browser.component";
import { FormArray, FormBuilder, FormGroup } from "@angular/forms";
import { FilterIntegrationOperator, getAttributeType, getFilterIntegrationOperatorTooltip, getPlaceholderText } from "./search-operators";
import { getColorForDataType } from "src/app/util/helper-functions";
import { first } from "rxjs/operators";

export class FilterIntegration {
    private dataBrowser: DataBrowserComponent;
    private projectApolloService: ProjectApolloService;

    filterAttributesSSForm: FormGroup;
    filterAttributesSS: string[];
    operatorDropdownArray = [];
    colorsAttributes: string[] = [];
    tooltipsArray: string[] = [];
    uniqueValuesDict: { [key: string]: string[] } = {};

    constructor(dataBrowser: DataBrowserComponent, projectApolloService: ProjectApolloService, private formBuilder: FormBuilder) {
        this.dataBrowser = dataBrowser;
        this.projectApolloService = projectApolloService;
    }

    initFilterForm() {
        this.filterAttributesSSForm = this.formBuilder.group({
            filterAttributes: this.formBuilder.array([]) as FormArray
        });
        this.getFilterAttributesSS().push(this.formBuilder.group({
            name: this.filterAttributesSS ? this.filterAttributesSS[0] : '',
            operator: this.operatorDropdownArray[0],
            searchValue: '',
            searchValueBetween: '',
            addText: this.filterAttributesSS ? getPlaceholderText(getAttributeType(this.dataBrowser.attributesSortOrder, this.filterAttributesSS[0])) : ''
        }));
        this.prepareColorAttributes();
        if (this.filterAttributesSS) {
            this.setFilterDropdownVal(this.filterAttributesSS[0], 0, "name");
        }
    }

    getFilterAttributesSS() {
        return this.filterAttributesSSForm.get('filterAttributes') as FormArray;
    }

    removeFilterAttributesSS(i: number) {
        this.getFilterAttributesSS().removeAt(i);
        this.checkIfAtLeastOneEmptyField();
    }

    addFilterAttributesSS() {
        const attributeType = getAttributeType(this.dataBrowser.attributesSortOrder, this.filterAttributesSS[0]);
        this.getFilterAttributesSS().push(this.formBuilder.group({
            name: this.filterAttributesSS[0],
            operator: this.operatorDropdownArray[0],
            searchValue: '',
            searchValueBetween: '',
            addText: getPlaceholderText(attributeType)
        }));
        this.checkIfAtLeastOneEmptyField();
    }

    setFilterDropdownVal(value: string, index: number, key: string) {
        const getIdxForm = this.getFilterAttributesSS().controls[index];
        if (key === "name") {
            const attributeType = getAttributeType(this.dataBrowser.attributesSortOrder, value);
            getIdxForm.get("addText").setValue(getPlaceholderText(attributeType));
            getIdxForm.get("searchValue").setValue("");
            getIdxForm.get("searchValueBetween").setValue("");
        }
        getIdxForm.get(key).setValue(value);
        this.checkIfAtLeastOneEmptyField();
    }

    prepareColorAttributes() {
        if (!this.filterAttributesSS) return;
        this.filterAttributesSS.forEach((attribute) => {
            const keyAtt = this.dataBrowser.attributesSortOrder.find(att => att.name === attribute).key;
            const dataType = this.dataBrowser.attributes[keyAtt].dataType;
            this.colorsAttributes.push(getColorForDataType(dataType));
        });
    }

    prepareTooltipsArray() {
        for (let t of Object.values(FilterIntegrationOperator)) {
            this.operatorDropdownArray.push(t.split("_").join(" "));
            this.tooltipsArray.push(getFilterIntegrationOperatorTooltip(t));
        }
    }

    checkDecimalValue(event: Event, i: number) {
        const formControlIdx = this.getFilterAttributesSS().controls[i];
        const attributeType = getAttributeType(this.dataBrowser.attributesSortOrder, formControlIdx.get("name").value);
        const operatorValue = formControlIdx.get("operator").value;
        this.dataBrowser.checkDecimalPatterns(attributeType, event, operatorValue);
        this.checkIfAtLeastOneEmptyField();
    }

    prepareAttFilter() {
        const filter = [];
        const filterAttributes = this.getFilterAttributesSS().getRawValue();
        if (!filterAttributes[0].name) return JSON.stringify(filter);
        for (let i = 0; i < filterAttributes.length; i++) {
            const attribute = filterAttributes[i];
            if (attribute.operator !== FilterIntegrationOperator.IN) {
                attribute.searchValue = this.parseSearchValue(attribute.name, attribute.searchValue);
            }
            if (attribute.operator === FilterIntegrationOperator.IN) {
                const split = attribute.searchValue.split(",");
                split.forEach((value, index) => {
                    split[index] = this.parseSearchValue(attribute.name, value);

                });
                attribute.searchValue = split;
                filter.push({ "key": attribute.name, "value": attribute.searchValue });
            } else if (attribute.operator === FilterIntegrationOperator.EQUAL) {
                filter.push({ "key": attribute.name, "value": attribute.searchValue });
            } else if (attribute.operator === FilterIntegrationOperator.BETWEEN) {
                attribute.searchValueBetween = this.parseSearchValue(attribute.name, attribute.searchValueBetween);
                const values = [attribute.searchValue, attribute.searchValueBetween];
                filter.push({ "key": attribute.name, "value": values, "type": "between" });
            }
        }
        return JSON.stringify(filter);
    }

    parseSearchValue(attributeName: any, value: any) {
        const attributeType = getAttributeType(this.dataBrowser.attributesSortOrder, attributeName);
        if (attributeType == "INTEGER") {
            value = parseInt(value);
        } else if (attributeType == "FLOAT") {
            value = parseFloat(value);
        } else if (attributeType == "BOOLEAN") {
            value = value == "true" ? true : false;
        }
        return value;
    }

    clearForm() {
        this.dataBrowser.embeddingSelectSS.nativeElement.value = this.dataBrowser.similarSearchHelper.embeddings[0].id;
        this.dataBrowser.embeddingSelectSS.nativeElement.dispatchEvent(new Event('change'));
        this.filterAttributesSSForm.reset();
    }

    checkIfAtLeastOneEmptyField() {
        const searchValues = [];
        this.getFilterAttributesSS().controls.forEach((control) => {
            if (control.get("operator").value == FilterIntegrationOperator.BETWEEN) {
                searchValues.push(control.get("searchValue").value == "" || control.get("searchValueBetween").value == "");
            } else {
                searchValues.push(control.get("searchValue").value == "");
            }
        });
        this.dataBrowser.atLeastOneEmptyField = searchValues.includes(true);
    }

}