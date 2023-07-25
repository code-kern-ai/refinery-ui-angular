import { ProjectApolloService } from "src/app/base/services/project/project-apollo.service";
import { DataBrowserComponent } from "../data-browser.component";
import { FormArray, FormBuilder, FormGroup } from "@angular/forms";
import { Attribute } from "src/app/projects/components/project-settings/entities/attribute.type";
import { FilterIntegrationOperator, getAttributeType, getFilterIntegrationOperatorTooltip } from "./search-operators";
import { getColorForDataType } from "src/app/util/helper-functions";

export class FilterIntegration {
    private dataBrowser: DataBrowserComponent;
    private projectApolloService: ProjectApolloService;

    filterAttributesSSForm: FormGroup;
    filterAttributesSS: Attribute[];
    operatorDropdownArray = [];
    colorsAttributes: string[] = [];
    tooltipsArray: string[] = [];

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
            searchValueBetween: ''
        }));
        this.prepareColorAttributes();
    }

    getFilterAttributesSS() {
        return this.filterAttributesSSForm.get('filterAttributes') as FormArray;
    }

    removeFilterAttributesSS(i: number) {
        this.getFilterAttributesSS().removeAt(i);
    }

    addFilterAttributesSS() {
        this.getFilterAttributesSS().push(this.formBuilder.group({
            name: this.filterAttributesSS[0],
            operator: this.operatorDropdownArray[0],
            searchValue: '',
            searchValueBetween: ''
        }));
    }

    setFilterDropdownVal(value: string, index: number, key: string) {
        const getIdxForm = this.getFilterAttributesSS().controls[index].get(key);
        getIdxForm.setValue(value);
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
    }

    prepareAttFilter() {
        const filter = [];
        const filterAttributes = this.getFilterAttributesSS().getRawValue();
        for (let i = 0; i < filterAttributes.length; i++) {
            const attribute = filterAttributes[i];
            if (attribute.operator === FilterIntegrationOperator.IN) {
                filter.push({ "key": attribute.name, "value": attribute.searchValue.split(",") });
            } else if (attribute.operator === FilterIntegrationOperator.EQUAL) {
                filter.push({ "key": attribute.name, "value": attribute.searchValue });
            } else if (attribute.operator === FilterIntegrationOperator.BETWEEN) {
                filter.push({ "key": attribute.name, "value": attribute.searchValueBetween, "type": "between" });
            }
        }
        return JSON.stringify(filter);
    }
}