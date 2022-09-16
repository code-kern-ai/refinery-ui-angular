

export enum AttributeCalculationExamples {
    AC_EMPTY_TEMPLATE
}

export class AttributeCodeLookup {
    private static templateEnumArray = [];

    static getAttributeCalculationTemplate(l: AttributeCalculationExamples, name: string) {
        switch (l) {
            case AttributeCalculationExamples.AC_EMPTY_TEMPLATE:
                return {
                   code: `def `+ name + ` (record):
    #     return "hello world"
`}
        }
    }
}