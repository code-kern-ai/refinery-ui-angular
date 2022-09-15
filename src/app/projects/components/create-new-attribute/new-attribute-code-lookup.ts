

export enum AttributeCalculationExamples {
    AC_EMPTY_TEMPLATE
}

export class AttributeCodeLookup {
    private static templateEnumArray = [];

    static getInformationSourceTemplate(l: AttributeCalculationExamples) {
        switch (l) {
            case AttributeCalculationExamples.AC_EMPTY_TEMPLATE:
                return {
                    name: "my_labeling_function", code: `def ac(record):
    # e.g. change template function
    # if "some_value" in record["str_attribute"].text.lower():
    #     return "your_label"
`}
        }
    }
}