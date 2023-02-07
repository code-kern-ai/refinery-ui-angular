import { LabelingSuiteTaskHeaderTaskSettings } from "../../helper/manager/settings";

export type LabelingSuiteTaskHeaderDisplayData = {
    id: string;
    name: string;
    hoverGroups: string;
    settings: LabelingSuiteTaskHeaderTaskSettings;
    orderPos: number;
    labels: {
        [labelId: string]: LabelingSuiteTaskHeaderLabelDisplayData
    };
    labelOrder: string[];//labelId array
}

export type LabelingSuiteTaskHeaderLabelDisplayData = {
    id: string;
    taskId: string;
    name: string;
    hoverGroups: string;
    hotkey: string;
    color: {
        name: string;
        backgroundColor: string;
        textColor: string;
        borderColor: string;
    }
}

export type QuickButtonConfig = {
    showManual: string[];
    showWeakSupervision: string[];
    showModel: string[];
    showHeuristics: string[];
    all: string[];
    nothing: string[];
    default: string[];

}

export function getQuickButtonConfig(): QuickButtonConfig {
    return {
        showManual: ['bg-green-200', 'bg-gray-200', 'bg-gray-200', 'bg-gray-200'],
        showWeakSupervision: ['bg-gray-200', 'bg-green-200', 'bg-gray-200', 'bg-gray-200'],
        showModel: ['bg-gray-200', 'bg-gray-200', 'bg-green-200', 'bg-gray-200'],
        showHeuristics: ['bg-gray-200', 'bg-gray-200', 'bg-gray-200', 'bg-green-200'],
        all: ['bg-green-200', 'bg-green-200', 'bg-green-200', 'bg-green-200'],
        nothing: ['bg-white', 'bg-white', 'bg-white', 'bg-white'],
        default: ['bg-green-200', 'bg-green-200', 'bg-white', 'bg-white'],
    }
}