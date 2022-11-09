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
        case SearchOperator.TRUE:
            return 'IS TRUE';
        case SearchOperator.FALSE:
            return 'IS FALSE';
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
    TRUE = 'TRUE',
    FALSE = 'FALSE'
}
