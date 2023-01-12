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
        hoverColor: string;
    }
}