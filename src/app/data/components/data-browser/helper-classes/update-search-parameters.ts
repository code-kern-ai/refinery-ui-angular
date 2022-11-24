import { DataBrowserComponent } from "../data-browser.component";
import { getAttributeType, SearchOperator } from "./search-operators";
import { SearchItemType, StaticOrderByKeys } from "./search-parameters";

export class UpdateSearchParameters {
    private dataBrowser: DataBrowserComponent;

    constructor(dataBrowser: DataBrowserComponent) {
        this.dataBrowser = dataBrowser;
    }

    refreshSearchParamText() {
        for (let p of this.dataBrowser.activeSearchParams) {
            this.updateSearchParamText(p);
            this.createSplittedText(p);
        }
    }
    private createSplittedText(p) {
        const groupName = this.dataBrowser.searchGroups.get(p.values.groupKey).nameAdd + ':';
        p.searchTextReplaced = p.searchText.replaceAll("\nAND", "\n<gn>" + groupName + "\n");
        p.splittedText = p.searchTextReplaced.split("\n<gn>");
    }

    private updateSearchParam(searchElement, newValues) {
        searchElement.values = newValues;
        this.updateSearchParamText(searchElement);
        this.createSplittedText(searchElement);
    }

    private updateSearchParamText(searchElement) {
        if (searchElement.values.type == SearchItemType.ATTRIBUTE) {
            const attributeType = getAttributeType(this.dataBrowser.attributesSortOrder, searchElement.values.name);
            if (searchElement.values.operator == SearchOperator.BETWEEN) {
                if (attributeType == "INTEGER" || attributeType == "FLOAT") {
                    searchElement.searchText =
                        searchElement.values.name +
                        ' ' +
                        searchElement.values.operator +
                        " " +
                        searchElement.values.searchValue +
                        "" + " AND " + searchElement.values.searchValueBetween;
                } else {
                    searchElement.searchText =
                        searchElement.values.name +
                        ' ' +
                        searchElement.values.operator +
                        " '" +
                        searchElement.values.searchValue +
                        "'" + " AND '" + searchElement.values.searchValueBetween + "'";
                }
            } else if (searchElement.values.operator == '') {
                searchElement.searchText = searchElement.values.name;
            } else if (searchElement.values.operator == SearchOperator.IN || searchElement.values.operator == "IN WC") {
                if (attributeType == "INTEGER" || attributeType == "FLOAT") {
                    searchElement.searchText =
                        searchElement.values.name +
                        ' ' +
                        searchElement.values.operator +
                        " (" +
                        searchElement.values.searchValue + ")";
                } else {
                    const splitTextBySeparator = searchElement.values.searchValue.split(this.dataBrowser.dataBrowserModals.configuration.separator).filter(i => i);
                    searchElement.searchText = searchElement.values.name + ' ' + searchElement.values.operator + " (" + splitTextBySeparator.map(x => "'" + x + "'").join(", ") + ")";
                }
            }
            else {
                if (attributeType == "INTEGER" || attributeType == "FLOAT") {
                    searchElement.searchText =
                        searchElement.values.name +
                        ' ' +
                        searchElement.values.operator +
                        " " +
                        searchElement.values.searchValue;
                }
                else {
                    searchElement.searchText =
                        searchElement.values.name +
                        ' ' +
                        searchElement.values.operator +
                        " '" +
                        searchElement.values.searchValue +
                        "'";
                }
            }
            if (searchElement.values.negate)
                searchElement.searchText = 'NOT (' + searchElement.searchText + ')';
            if (this.dataBrowser.dataBrowserModals.configuration.separator == "-")
                searchElement.searchText = searchElement.searchText.replaceAll("-", ",");
        } else if (searchElement.values.type == SearchItemType.LABELING_TASK) {
            searchElement.searchText = this.dataBrowser._labelingTaskBuildSearchParamText(
                searchElement.values
            );
        } else if (searchElement.values.type == SearchItemType.USER) {
            searchElement.searchText = this.dataBrowser.userFilter.buildSearchParamText(
                searchElement.values
            );
        } else if (searchElement.values.type == SearchItemType.ORDER_BY) {
            searchElement.searchText = this._orderByBuildSearchParamText(
                searchElement.values
            );

            this.dataBrowser.staticSliceOrderActive = searchElement.searchText.replace("ORDER BY ", "");
        }
    }

    refreshSearchParams(values) {
        for (let p of this.dataBrowser.activeSearchParams) {
            if (p.id == values.id) {
                if (values.active) {
                    p.values = values;
                    this.updateSearchParam(p, values);
                    return;
                } else {
                    this.dataBrowser.activeSearchParams = this.dataBrowser.activeSearchParams.filter(
                        (e) => e.id != values.id
                    );
                    return;
                }
            }
        }
        //doesn't exist yet
        if (values.active) {
            let p = { id: values.id };
            this.updateSearchParam(p, values);
            this.dataBrowser.activeSearchParams.push(p);
        }
    }

    private _orderByBuildSearchParamText(values): string {
        let text = '';
        for (const element of values.orderBy) {
            if (element.active) {
                if (text) text += "\n";
                else text = "ORDER BY "
                text += element.displayName;
                if (element.displayName != this.dataBrowser.getOrderByDisplayName(StaticOrderByKeys.RANDOM)) {
                    text += (element.direction == 1 ? ' ASC' : ' DESC');
                } else {
                    text += ' (seed:' + element.seedString + ')';
                }
            }
        }
        return text;
    }


}