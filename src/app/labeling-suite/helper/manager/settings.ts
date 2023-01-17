import { HoverGroupDirective } from "src/app/base/directives/hover-group.directive";
import { LabelSource } from "src/app/base/enum/graphql-enums";
import { enumToArray, jsonCopy, transferNestedDict } from "src/app/util/helper-functions";
import { DoBeforeDestroy } from "src/app/util/interfaces";

export type LabelingSuiteSettings = {
    main: LabelingSuiteMainSettings;
    overviewTable: LabelingSuiteOverviewTableSettings;
    task: LabelingSuiteTaskHeaderSettings;
    labeling: LabelingSuiteLabelingSettings;
}

export type LabelingSuiteOverviewTableSettings = {
    showHeuristics: boolean;
    includeLabelDisplaySettings: boolean;
}

export type LabelingSuiteMainSettings = {
    autoNextRecord: boolean;
    disableHoverGroups: boolean;
}
export type LabelingSuiteLabelingSettings = {
    showNLabelButton: number;
    showTaskNames: boolean;
    compactClassificationLabelDisplay: boolean;
}

//labeling task
export type LabelingSuiteTaskHeaderSettings = {
    isCollapsed: boolean;
    alwaysShowQuickButtons: boolean;
    //caution technically irritating because the line below is not for projectIds but for any string key -> thats why any needs to be added to allow isCollapsed boolean
    [projectId: string]: LabelingSuiteTaskHeaderProjectSettings | any;
}

export type LabelingSuiteTaskHeaderProjectSettings = {
    [taskId: string]: LabelingSuiteTaskHeaderTaskSettings
}

export type LabelingSuiteTaskHeaderTaskSettings = {
    [labelId: string]: LabelingSuiteTaskHeaderLabelSettings
}

export type LabelingSuiteTaskHeaderLabelSettings = {
    showManual: boolean;
    showWeakSupervision: boolean;
    showModel: boolean;
    showHeuristics: boolean;
}

export enum ComponentType {
    ALL,
    MAIN,
    OVERVIEW_TABLE,
    LABELING,
    TASK_HEADER,
}

export class LabelingSuiteSettingManager implements DoBeforeDestroy {
    static localStorageKey = "labelingSuiteSettings";
    public settings: LabelingSuiteSettings;

    private registeredSettingsListeners: Map<ComponentType, Map<Object, () => void>> = new Map<ComponentType, Map<Object, () => void>>();
    private projectId: string;

    constructor(projectId: string) {
        this.projectId = projectId;
        enumToArray(ComponentType).forEach(ct => {
            this.registeredSettingsListeners.set(ct, new Map<Object, () => void>());
        });
        this.loadSettings();
        this.runSettingListeners(ComponentType.ALL);
    }
    doBeforeDestroy(): void {
        this.saveSettings();
    }

    public loadSettings() {
        this.settings = this.getDefaultLabelingSuiteSettings();
        let tmp = localStorage.getItem(LabelingSuiteSettingManager.localStorageKey);
        if (tmp) {
            const tmpSettings = JSON.parse(tmp);
            //to ensure new setting values exist and old ones are loaded if matching name
            transferNestedDict(tmpSettings, this.settings);
            if (tmpSettings.task) {
                transferNestedDict(tmpSettings.task, this.settings.task, false);
            }
        }
        if (!this.settings.task[this.projectId]) this.settings.task[this.projectId] = {};
        this.runSettingListeners(ComponentType.ALL);
    }

    public saveSettings() {
        localStorage.setItem(LabelingSuiteSettingManager.localStorageKey, JSON.stringify(this.settings));
    }

    public setDefaultSettings() {
        this.settings = this.getDefaultLabelingSuiteSettings();
        localStorage.removeItem(LabelingSuiteSettingManager.localStorageKey);
        this.runSettingListeners(ComponentType.ALL);
    }

    private getDefaultLabelingSuiteSettings(): LabelingSuiteSettings {
        return {
            main: {
                autoNextRecord: false,
                disableHoverGroups: false,
            },
            overviewTable: {
                showHeuristics: false,
                includeLabelDisplaySettings: true,
            },
            task: {
                isCollapsed: false,
                alwaysShowQuickButtons: false,
            },
            labeling: {
                showNLabelButton: 5,
                showTaskNames: true,
                compactClassificationLabelDisplay: true,
            }
        }
    }

    public getDefaultTaskOverviewLabelSettings(): LabelingSuiteTaskHeaderLabelSettings {
        return {
            showManual: true,
            showWeakSupervision: true,
            showModel: false,
            showHeuristics: false,
        }
    }

    public registerSettingListener(type: ComponentType, caller: Object, func: () => void) {
        if (!this.registeredSettingsListeners.has(type)) throw Error("Component type not available");
        this.registeredSettingsListeners.get(type).set(caller, func);
    }
    public unregisterSettingListener(type: ComponentType, caller: Object) {
        if (!this.registeredSettingsListeners.has(type)) throw Error("Component type not available");
        if (this.registeredSettingsListeners.get(type).get(caller)) {
            this.registeredSettingsListeners.get(type).delete(caller);
        }
    }

    public runSettingListeners(type: ComponentType, saveSettings: boolean = true) {
        if (type == ComponentType.ALL) {
            enumToArray(ComponentType).forEach(ct => ct != ComponentType.ALL ? this.runSettingListeners(ct, false) : null);
            return;
        }
        if (type == ComponentType.MAIN) {
            if (this.settings.main.disableHoverGroups != HoverGroupDirective.disableHover) {
                HoverGroupDirective.disableHover = this.settings.main.disableHoverGroups;
            }
        }
        if (!this.registeredSettingsListeners.has(type)) throw Error("Component type not available");
        if (this.registeredSettingsListeners.get(type).size != 0) {
            this.registeredSettingsListeners.get(type).forEach((func, key) => func.call(key));
        }

        if (saveSettings) this.saveSettings();
    }


    public filterRlaDataForOverviewTable(data: any[], rlaKey?: string): any[] {
        let filtered = data;
        if (!this.settings.overviewTable.showHeuristics) {
            if (rlaKey) filtered = filtered.filter(entry => entry[rlaKey].sourceType != LabelSource.INFORMATION_SOURCE);
            else filtered = filtered.filter(rla => rla.sourceType != LabelSource.INFORMATION_SOURCE);
        }
        if (this.settings.overviewTable.includeLabelDisplaySettings) {
            if (rlaKey) filtered = filtered.filter(entry => this.filterRlaLabelCondition(entry[rlaKey]));
            else filtered = filtered.filter(rla => this.filterRlaLabelCondition(rla));
        }
        return filtered;
    }

    public filterRlaDataForLabeling(data: any[], rlaKey?: string): any[] {
        let filtered = data;
        if (rlaKey) filtered = filtered.filter(entry => this.filterRlaLabelCondition(entry[rlaKey]));
        else filtered = filtered.filter(rla => this.filterRlaLabelCondition(rla));

        return filtered;
    }

    private filterRlaLabelCondition(rla: any): boolean {
        const taskId = rla.labelingTaskLabel.labelingTask.id;
        const rlaSettings: LabelingSuiteTaskHeaderLabelSettings = this.settings.task[this.projectId][taskId][rla.labelingTaskLabelId];
        switch (rla.sourceType) {
            case LabelSource.MANUAL:
                return rlaSettings.showManual;
            case LabelSource.INFORMATION_SOURCE:
                return rlaSettings.showHeuristics;
            case LabelSource.MODEL_CALLBACK:
                return rlaSettings.showModel;
            case LabelSource.WEAK_SUPERVISION:
                return rlaSettings.showWeakSupervision;
            default:
                console.log("unknown source type in setting rla filter", rla)
                return false;
        }
    }
}
