import { DataBrowserComponent } from "../data-browser.component";
import { FormArray, FormBuilder, FormGroup } from "@angular/forms";
import { FilterIntegrationOperator, getAttributeType, getFilterIntegrationOperatorTooltip, getPlaceholderText } from "./search-operators";
import { getColorForDataType } from "src/app/util/helper-functions";

export class FilterIntegration {
    private dataBrowser: DataBrowserComponent;

    filterAttributesForm: FormGroup;
    filterAttributesSS: string[];
    colorsAttributes: string[] = [];
    uniqueValuesDict: { [key: string]: string[] } = {};
    operatorsDict: { [key: string]: string[] } = {};
    tooltipsDict: { [key: string]: string[] } = {};

    constructor(dataBrowser: DataBrowserComponent, private formBuilder: FormBuilder) {
        this.dataBrowser = dataBrowser;
        this.formBuilder = formBuilder;
    }

    initFilterForm() {
        this.filterAttributesForm = this.formBuilder.group({
            filterAttributes: this.formBuilder.array([]) as FormArray
        });
        this.getFilterAttributesSS().push(this.formBuilder.group({
            name: this.filterAttributesSS ? this.filterAttributesSS[0] : '',
            operator: this.filterAttributesSS ? this.operatorsDict[this.filterAttributesSS[0]][0] : '',
            searchValue: '',
            searchValueBetween: '',
            addText: this.filterAttributesSS ? getPlaceholderText(getAttributeType(this.dataBrowser.attributesSortOrder, this.filterAttributesSS[0])) : ''
        }));
        if (this.filterAttributesSS) {
            this.setFilterDropdownVal(this.filterAttributesSS[0], 0, "name");
            this.setFilterDropdownVal(this.operatorsDict[this.filterAttributesSS[0]][0], 0, "operator");
        }
    }

    getFilterAttributesSS() {
        return this.filterAttributesForm.get('filterAttributes') as FormArray;
    }

    removeFilterAttributesSS(i: number) {
        this.getFilterAttributesSS().removeAt(i);
        this.checkIfAtLeastOneEmptyField();
    }

    addFilterAttributesSS() {
        const attributeType = getAttributeType(this.dataBrowser.attributesSortOrder, this.filterAttributesSS[0]);
        this.getFilterAttributesSS().push(this.formBuilder.group({
            name: this.filterAttributesSS[0],
            operator: this.operatorsDict[this.filterAttributesSS[0]][0],
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
            getIdxForm.get("operator").setValue(this.operatorsDict[value][0]);
            this.prepareOperatorsAndTooltips();
        }
        getIdxForm.get(key).setValue(value);
        this.checkIfAtLeastOneEmptyField();
    }

    prepareOperatorsAndTooltips() {
        if (!this.filterAttributesSS) return;
        let operators = [];
        let tooltips = [];
        this.colorsAttributes = [];
        for (let t of Object.values(FilterIntegrationOperator)) {
            operators.push(t.split("_").join(" "));
            tooltips.push(getFilterIntegrationOperatorTooltip(t));
        }
        this.filterAttributesSS.forEach((attribute) => {
            const attributeType = getAttributeType(this.dataBrowser.attributesSortOrder, attribute);
            if (attributeType !== "INTEGER") {
                operators = operators.filter(operator => operator !== FilterIntegrationOperator.BETWEEN);
                tooltips = tooltips.filter(tooltip => tooltip !== getFilterIntegrationOperatorTooltip(FilterIntegrationOperator.BETWEEN));
            }
            this.operatorsDict[attribute] = operators;
            this.tooltipsDict[attribute] = tooltips;
            this.colorsAttributes.push(getColorForDataType(attributeType));

        });
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
        this.filterAttributesForm.reset();
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