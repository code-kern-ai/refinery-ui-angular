import { LabelSource } from "src/app/base/enum/graphql-enums";
import { DataBrowserComponent } from "../data-browser.component";
import { SearchGroup, SearchOperator, StaticOrderByKeys } from "./search-parameters";



export class DataBrowserFilterParser {
    private dataBrowser: DataBrowserComponent;

    constructor(dataBrowser: DataBrowserComponent) {
        this.dataBrowser = dataBrowser;
    }



    public parseFilterToExtended(): string[] {
        let toReturn = [];
        toReturn.push(JSON.stringify(this.buildFilterRecordCategory(true)));
        if (this.dataBrowser.activeSearchParams.length == 0) {
            this.dataBrowser.lastSearchParams = JSON.stringify([]);
            return toReturn;
        }
        this.dataBrowser.requestedDrillDown = this.dataBrowser.fullSearch.get("DRILL_DOWN").get("DRILL_DOWN").value;
        let first = false;
        let attributeFilter;
        let orderBy = { ORDER_BY: [], ORDER_DIRECTION: [] };
        for (let searchElement of this.dataBrowser.activeSearchParams) {
            if (searchElement.values.group == SearchGroup.ATTRIBUTES) {
                attributeFilter = this.buildFilterElementAttribute(first, searchElement);
                toReturn.push(JSON.stringify(attributeFilter));
            } else if (searchElement.values.group == SearchGroup.LABELING_TASKS) {
                this.appendBlackAndWhiteListLabelingTask(toReturn, searchElement);
            } else if (searchElement.values.group == SearchGroup.USER_FILTER) {
                this.appendBlackAndWhiteListUser(toReturn, searchElement);
            } else if (searchElement.values.group == SearchGroup.ORDER_STATEMENTS) {
                this.appendActiveOrderBy(searchElement.values, orderBy);
            }
        }
        if (orderBy.ORDER_BY.length > 0) {
            toReturn.push(JSON.stringify(orderBy));
        }


        this.dataBrowser.lastSearchParams = JSON.stringify(this.dataBrowser.activeSearchParams);
        return toReturn;
    }

    public getOrderByJSON() {
        let orderBy = { ORDER_BY: [], ORDER_DIRECTION: [] };
        for (let searchElement of this.dataBrowser.activeSearchParams) {
            if (searchElement.values.group == SearchGroup.ORDER_STATEMENTS) {
                this.appendActiveOrderBy(searchElement.values, orderBy);
            }
        }
        if (orderBy.ORDER_BY.length > 0) return JSON.stringify(orderBy);

        return null;
    }


    private appendActiveOrderBy(values, orderBy) {
        for (const element of values.orderBy) {
            if (!element.active) continue;
            let key = element.orderByKey;
            if (element.isAttribute) key = "RECORD_DATA@" + key;
            if (!orderBy.ORDER_BY.includes(key)) {
                orderBy.ORDER_BY.push(key);
                if (key == StaticOrderByKeys.RANDOM) {
                    orderBy.ORDER_DIRECTION.push(element.seedString)
                } else {
                    orderBy.ORDER_DIRECTION.push(
                        element.direction == 1 ? 'ASC' : 'DESC');
                }

            }
        }
    }
    private appendBlackAndWhiteListUser(appendTo, searchElement) {
        const drillDown: boolean = this.dataBrowser.fullSearch.get("DRILL_DOWN").get("DRILL_DOWN").value;
        this.appendBlackAndWhiteListUserForArray(
            appendTo,
            searchElement.values.users,
            drillDown
        );

    }
    private appendBlackAndWhiteListUserForArray(
        appendTo: string[],
        array: any[],
        drillDown: boolean = false
    ): any {
        if (drillDown) {
            for (const l of array) {
                this.appendBlackAndWhiteListUserForArray(appendTo, [l], false);
            }
            return;
        }

        let whitelist = {
            SUBQUERY_TYPE: 'WHITELIST',
            SUBQUERIES: [],
        };
        let blacklist = {
            SUBQUERY_TYPE: 'BLACKLIST',
            SUBQUERIES: [],
        };
        let inValues = [],
            notInValues = [];
        for (let c of array) {
            if (c.active) {
                if (c.negate) notInValues.push(c.id);
                else inValues.push(c.id);
            }
        }

        if (inValues.length != 0) {
            whitelist.SUBQUERIES.push({
                QUERY_TEMPLATE: 'SUBQUERY_RLA_CREATED_BY',
                VALUES: inValues,
            });
        }
        if (notInValues.length != 0) {
            blacklist.SUBQUERIES.push({
                QUERY_TEMPLATE: 'SUBQUERY_RLA_CREATED_BY',
                VALUES: notInValues,
            });
        }

        if (whitelist.SUBQUERIES.length > 0)
            appendTo.push(JSON.stringify(whitelist));
        if (blacklist.SUBQUERIES.length > 0)
            appendTo.push(JSON.stringify(blacklist));
    }

    private appendBlackAndWhiteListLabelingTask(appendTo, searchElement) {
        const drillDown: boolean = this.dataBrowser.fullSearch.get("DRILL_DOWN").get("DRILL_DOWN").value;
        this.appendBlackAndWhiteListLabelingTaskForArray(
            appendTo,
            searchElement.values.manualLabels,
            LabelSource.MANUAL,
            drillDown
        );
        this.appendBlackAndWhiteListLabelingTaskForArray(
            appendTo,
            searchElement.values.weakSupervisionLabels,
            LabelSource.WEAK_SUPERVISION,
            drillDown
        );
        this.appendBlackAndWhiteListLabelingTaskForArray(
            appendTo,
            searchElement.values.modelCallbackLabels,
            LabelSource.MODEL_CALLBACK,
            drillDown
        );
        this.appendBlackAndWhiteListLabelingTaskForArray(
            appendTo,
            searchElement.values.informationSources,
            LabelSource.INFORMATION_SOURCE,
            drillDown
        );
        this.appendBlackAndWhiteListLabelingTaskForConfidence(
            appendTo,
            searchElement.values.weakSupervisionConfidence,
            this.dataBrowser.tasks.get(searchElement.values.taskId).labels.map(l => l.id),
            true
        );
        this.appendBlackAndWhiteListLabelingTaskForConfidence(
            appendTo,
            searchElement.values.modelCallbackConfidence,
            this.dataBrowser.tasks.get(searchElement.values.taskId).labels.map(l => l.id),
            false
        );
        const isMixed = searchElement.values.isWithDifferentResults
        if (isMixed.active) {
            let whitelist = {
                SUBQUERY_TYPE: 'WHITELIST',
                SUBQUERIES: [{
                    QUERY_TEMPLATE: isMixed.taskType == 'MULTICLASS_CLASSIFICATION' ? 'SUBQUERY_RLA_DIFFERENT_IS_CLASSIFICATION' : 'SUBQUERY_RLA_DIFFERENT_IS_EXTRACTION',
                    VALUES: [isMixed.taskId],
                }],
            };
            appendTo.push(JSON.stringify(whitelist));
        }
    }
    /**
      * Builds the black or whitelist filter parameter and appends them to the filter array
      * @param  {String[]} appendTo  overall filter array as referece to leave the appending to the funciton itself (array of JSON strings).
      * @param  {any[]} confidence group of confidence filter values, includes active, negate, lower and upper value.
      * @param  {string[]} labelIds id of all the labels connected to the task.
      */
    private appendBlackAndWhiteListLabelingTaskForConfidence(
        appendTo: string[],
        confidence,
        labelIds: string[],
        forWeakSupervision: boolean = true
    ): any {
        if (!confidence.active) return;

        const source = forWeakSupervision ? LabelSource.WEAK_SUPERVISION : LabelSource.MODEL_CALLBACK;
        let whitelist = {
            SUBQUERY_TYPE: 'WHITELIST',
            SUBQUERIES: [{
                QUERY_TEMPLATE: 'SUBQUERY_RLA_LABEL',
                VALUES: [source, ...labelIds],
            }],
        };
        appendTo.push(JSON.stringify(whitelist));
        // add confidence filter
        let list = {
            SUBQUERY_TYPE: confidence.negate ? 'BLACKLIST' : 'WHITELIST',
            SUBQUERIES: [],
        };

        const query = forWeakSupervision ? 'SUBQUERY_RLA_CONFIDENCE' : 'SUBQUERY_CALLBACK_CONFIDENCE';
        list.SUBQUERIES.push({
            QUERY_TEMPLATE: query,
            VALUES: [confidence.lower * 0.01, confidence.upper * 0.01],
        });

        appendTo.push(JSON.stringify(list));
    }

    private appendBlackAndWhiteListLabelingTaskForArray(
        appendTo: string[],
        array: any[],
        labelSource: LabelSource,
        drillDown: boolean = false,
        onlyNoLabel: boolean = false //for recursion of NO_LABEL only
    ): any {
        if (drillDown) {
            for (const l of array) {
                if (l.id == 'NO_LABEL') {
                    this.appendBlackAndWhiteListLabelingTaskForArray(appendTo, array, labelSource, false, true);
                } else {
                    this.appendBlackAndWhiteListLabelingTaskForArray(appendTo, [l], labelSource, false);
                }
            }
            return;
        }

        const forLabel = labelSource != LabelSource.INFORMATION_SOURCE;
        let whitelist = {
            SUBQUERY_TYPE: 'WHITELIST',
            SUBQUERIES: [],
        };
        let blacklist = {
            SUBQUERY_TYPE: 'BLACKLIST',
            SUBQUERIES: [],
        };
        let addNoLabel = false;
        let inValues = [],
            notInValues = [];
        for (let c of array) {
            if (c.active) {
                if (c.id == 'NO_LABEL') addNoLabel = true;
                else if (!onlyNoLabel) {
                    if (c.negate) notInValues.push(c.id);
                    else inValues.push(c.id);
                }
            }
        }

        if (inValues.length != 0) {
            whitelist.SUBQUERIES.push({
                QUERY_TEMPLATE: forLabel
                    ? 'SUBQUERY_RLA_LABEL'
                    : 'SUBQUERY_RLA_INFORMATION_SOURCE',
                VALUES: [labelSource, ...inValues],
            });
        }
        if (notInValues.length != 0) {
            blacklist.SUBQUERIES.push({
                QUERY_TEMPLATE: forLabel
                    ? 'SUBQUERY_RLA_LABEL'
                    : 'SUBQUERY_RLA_INFORMATION_SOURCE',
                VALUES: [labelSource, ...notInValues],
            });
        }

        if (addNoLabel) {
            let values = [labelSource];
            for (let c of array) {
                if (c.id != 'NO_LABEL') values.push(c.id);
            }
            whitelist.SUBQUERIES.push({
                QUERY_TEMPLATE: 'SUBQUERY_RLA_NO_LABEL',
                VALUES: values,
            });
        }
        if (whitelist.SUBQUERIES.length > 0)
            appendTo.push(JSON.stringify(whitelist));
        if (blacklist.SUBQUERIES.length > 0)
            appendTo.push(JSON.stringify(blacklist));
    }

    private buildFilterRecordCategory(first: boolean) {
        const filterValue = this.dataBrowser.fullSearch.get("RECORD_CATEGORY").get("CATEGORY").value;
        this.dataBrowser.requestedRecordCategory = filterValue;
        let filterElement = {
            RELATION: first ? 'NONE' : 'AND',
            NEGATION: false,
            TARGET_TABLE: 'RECORD',
            TARGET_COLUMN: 'CATEGORY',
            OPERATOR: SearchOperator.EQUAL,
            VALUES: [filterValue],
        };

        return filterElement;
    }

    private buildFilterElementAttribute(first: boolean, searchElement) {
        let filterElement;
        if (searchElement.values.name == 'Any Attribute') {
            filterElement = {
                RELATION: first ? 'NONE' : 'AND',
                NEGATION: searchElement.values.negate,
                FILTER: [],
            };
            for (let i = 0; i < this.dataBrowser.attributesSortOrder.length; i++) {
                filterElement.FILTER.push({
                    RELATION: i == 0 ? 'NONE' : 'OR',
                    NEGATION: false,
                    TARGET_TABLE: 'RECORD',
                    TARGET_COLUMN: 'DATA',
                    OPERATOR: searchElement.values.operator,
                    VALUES: [
                        this.dataBrowser.attributes.get(this.dataBrowser.attributesSortOrder[i].key).name,
                        searchElement.values.searchValue,
                    ],
                });
            }
        } else {
            filterElement = {
                RELATION: first ? 'NONE' : 'AND',
                NEGATION: searchElement.values.negate,
                TARGET_TABLE: 'RECORD',
                TARGET_COLUMN: 'DATA',
                OPERATOR: searchElement.values.operator,
                VALUES: [searchElement.values.name, searchElement.values.searchValue],
            };
        }
        return filterElement;
    }

}
