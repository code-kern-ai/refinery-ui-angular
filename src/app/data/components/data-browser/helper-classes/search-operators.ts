export function getSearchOperatorTooltip(operator: SearchOperator): string {
    switch (operator) {
        case SearchOperator.EQUAL:
            return '= {value}';
        case SearchOperator.BEGINS_WITH:
            return 'ILIKE {value}%';
        case SearchOperator.ENDS_WITH:
            return 'ILIKE %{value}';
        case SearchOperator.CONTAINS:
            return 'ILIKE %{value}%';
        case SearchOperator.IN:
            return 'IN ({value})';
        case SearchOperator.BETWEEN:
            return 'BETWEEN {value}';
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
    BETWEEN = 'BETWEEN',
    GREATER = 'GREATER',
    GREATER_EQUAL = 'GREATER_EQUAL',
    LESS = 'LESS',
    LESS_EQUAL = 'LESS_EQUAL',
}

export function prepareFilterElements(searchElement, name, separator) {
    let values = [];
    if (searchElement.values.operator == SearchOperator.BETWEEN) {
        values = [name, searchElement.values.searchValue, searchElement.values.searchValueBetween];
    } else if (searchElement.values.operator == SearchOperator.IN) {
        const split = searchElement.values.searchValue.split(separator);
        values = [name, ...split];
    } else if (searchElement.values.operator == '') {
        // TODO: add the name of the operator for boolean
        values = [name, !searchElement.values.negate];
    } else {
        values = [name, searchElement.values.searchValue];
    }
    return values;
}