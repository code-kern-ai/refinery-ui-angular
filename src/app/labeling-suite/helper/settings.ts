export type LabelingSuiteSettings = {
    showHeuristic: boolean;
}

export function getDefaultLabelingSuiteSettings(): LabelingSuiteSettings {
    return {
        showHeuristic: false
    }
}


//maybe a full blown class?