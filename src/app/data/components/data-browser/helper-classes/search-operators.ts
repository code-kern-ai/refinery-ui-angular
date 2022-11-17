export function getSearchOperatorTooltip(operator: SearchOperator): string {
    switch (operator) {
        case SearchOperator.EQUAL:
            return '= {value}';
        case SearchOperator.BEGINS_WITH:
            return 'LIKE {value}%';
        case SearchOperator.ENDS_WITH:
            return 'LIKE %{value}';
        case SearchOperator.CONTAINS:
            return 'LIKE %{value}%';
        case SearchOperator.IN:
            return 'Included in separated list of values';
        case SearchOperator.IN_WC:
            return 'Like IN but with wildcard support (*,?,%,_)';
        case SearchOperator.BETWEEN:
            return '>= {a} and <= {b}';
        case SearchOperator.GREATER:
            return '> {value}';
        case SearchOperator.GREATER_EQUAL:
            return '>= {value}';
        case SearchOperator.LESS:
            return '< {value}';
        case SearchOperator.LESS_EQUAL:
            return '<= {value}';
    }
    return 'UNKNOWN';
}

export enum SearchOperator {
    EQUAL = 'EQUAL',
    BEGINS_WITH = 'BEGINS_WITH',
    ENDS_WITH = 'ENDS_WITH',
    CONTAINS = 'CONTAINS',
    IN = 'IN',
    IN_WC = 'IN_WC',
    BETWEEN = 'BETWEEN',
    GREATER = 'GREATER',
    GREATER_EQUAL = 'GREATER_EQUAL',
    LESS = 'LESS',
    LESS_EQUAL = 'LESS_EQUAL',
}

export function getAttributeType(attributes: any[], attributeName: string) {
    return attributes.find(att => att.name == attributeName)?.type;
}

export function prepareFilterElements(searchElement: any, name: string, separator: string, attributeType: string) {
    let values = [];
    if (searchElement.values.operator == SearchOperator.BETWEEN) {
        values = [name, searchElement.values.searchValue, searchElement.values.searchValueBetween];
    } else if (searchElement.values.operator == SearchOperator.IN || searchElement.values.operator == SearchOperator.IN_WC) {
        const split = searchElement.values.searchValue.split(separator).filter(i => i);
        values = [name, ...split];
    } else if (searchElement.values.operator == '') {
        searchElement.values.operator = SearchOperator.EQUAL;
        values = [name, searchElement.values.negate ? searchElement.values.negate : !searchElement.values.negate];
    } else {
        values = [name, attributeType != "BOOLEAN" ? searchElement.values.searchValue : !searchElement.values.negate];
    }
    values = parseFilterElements(searchElement, values, attributeType);
    return values;
}

export function parseFilterElements(searchElement: any, values: any, attributeType: string): any[] {
    if (attributeType == "INTEGER" && searchElement.values.operator != SearchOperator.IN_WC) {
        values.slice(1, values.length).forEach((value, index) => {
            values[index + 1] = parseInt(value);
        });
    } else if (attributeType == "FLOAT" && searchElement.values.operator != SearchOperator.IN_WC) {
        values.slice(1, values.length).forEach((value, index) => {
            values[index + 1] = parseFloat(value);
        });
    } else {
        values.slice(1, values.length).forEach((value, index) => {
            values[index + 1] = value;
        });
    }
    return values;
}

export function prepareOperator(searchElement: any, attributeType: string): string {
    if (searchElement.values.caseSensitive) {
        let operator = searchElement.values.operator;
        switch (operator) {
            case SearchOperator.BEGINS_WITH:
                operator = "BEGINS_WITH_CS";
                break;
            case SearchOperator.ENDS_WITH:
                operator = "ENDS_WITH_CS";
                break;
            case SearchOperator.CONTAINS:
                operator = "CONTAINS_CS";
                break;
            case SearchOperator.IN_WC:
                operator = "IN_WC_CS";
                break;
        }
        return operator;
    }

    if (attributeType == "BOOLEAN") {
        return SearchOperator.EQUAL;
    } else {
        return searchElement.values.operator;
    }
}