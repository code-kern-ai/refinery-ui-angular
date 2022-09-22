

export enum AttributeCalculationExamples {
    AC_EMPTY_TEMPLATE
}

export class AttributeCodeLookup {
    static getAttributeCalculationTemplate(l: AttributeCalculationExamples) {
        switch (l) {
            case AttributeCalculationExamples.AC_EMPTY_TEMPLATE:
                return {
                    code: `def ac(record):
    # e.g.
    return record["headline"].text.lower()
                `}
        }
    }

}