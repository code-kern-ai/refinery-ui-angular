

export enum AttributeCalculationExamples {
    AC_EMPTY_TEMPLATE
}

export class AttributeCodeLookup {
    static getAttributeCalculationTemplate(l: AttributeCalculationExamples, dataType: string) {
        switch (l) {
            case AttributeCalculationExamples.AC_EMPTY_TEMPLATE: {
                switch (dataType) {
                    case 'CATEGORY': return {
                        code: `def ac(record):
    # e.g. categorize the records conditional on the text length of a string attribute
    text_length = len(record["str_attribute"].text)
    if text_length < 35:
        return "short"
    elif text_length < 70:
        return "normal"
    else:
        return "long"
                    `}
                    case 'TEXT': return {
                        code: `def ac(record):
    # e.g. transform the string attribute to lower case
    return record["str_attribute"].text.lower()
                    `}
                    case 'BOOLEAN': return {
                        code: `def ac(record):
    # e.g. does the string attribute contain a digit
    return any([token.is_digit for token in record["str_attribute"]])
                    `}
                    case 'INTEGER': return {
                        code: `def ac(record):
    # e.g. length of the longest word in string attribute
    word_length = [len(word) for word in record["str_attribute"]]
    return max(word_length)
                    `}
                    case 'FLOAT': return {
                        code: `def ac(record):
    # e.g. mean number of chars per word
    words = record["str_attribute"].text.split()
    num_words = len(words)
    sum_word_lengths = sum([len(word) for word in words])
    return sum_word_lengths / num_words
                    `}
                    default: return {
                        code: ''
                    }
                }
            }
        }
    }

    static isCodeStillTemplate(code: string, dataType: string): boolean {

        return AttributeCodeLookup.getAttributeCalculationTemplate(AttributeCalculationExamples.AC_EMPTY_TEMPLATE, dataType).code.trim() == code.trim();
    }
}