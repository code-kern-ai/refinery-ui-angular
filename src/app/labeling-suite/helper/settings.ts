export type LabelingSuiteSettings = {
    showHeuristic: boolean;
}

export function getDefaultLabelingSuiteSettings(): LabelingSuiteSettings {
    return {
        showHeuristic: false
    }
}