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
    show: boolean;
    showHeuristics: boolean;
    includeLabelDisplaySettings: boolean;
}

export type LabelingSuiteMainSettings = {
    autoNextRecord: boolean;
    hoverGroupBackgroundColor: string;
    hoverGroupBackgroundColorClass: string;
}
export type LabelingSuiteLabelingSettings = {
    showNLabelButton: number;
    showTaskNames: boolean;
    compactClassificationLabelDisplay: boolean;
    swimLaneExtractionDisplay: boolean;
}

//labeling task
export type LabelingSuiteTaskHeaderSettings = {
    show: boolean;
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

export const colorOptions = [
    "red", "orange", "amber",
    "yellow", "lime", "green",
    "emerald", "teal", "cyan",
    "sky", "blue", "indigo",
    "violet", "purple", "fuchsia",
    "pink", "rose"]



export class LabelingSuiteSettingManager implements DoBeforeDestroy {
    static localStorageKey = "labelingSuiteSettings";
    public settings: LabelingSuiteSettings;
    public page: ComponentType = ComponentType.MAIN;

    private registeredSettingsListeners: Map<ComponentType, Map<Object, () => void>> = new Map<ComponentType, Map<Object, () => void>>();
    private projectId: string;

    public hoverColorOptions;

    constructor(projectId: string) {
        this.projectId = projectId;
        this.prepareColorOptions();
        enumToArray(ComponentType).forEach(ct => {
            this.registeredSettingsListeners.set(ct, new Map<Object, () => void>());
        });
        this.loadSettings();
        this.runSettingListeners(ComponentType.ALL);
    }
    doBeforeDestroy(): void {
        this.saveSettings();
    }

    private prepareColorOptions() {
        this.hoverColorOptions = ['None', ...colorOptions];
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
        const tmpSettings = this.getDefaultLabelingSuiteSettings();
        transferNestedDict(tmpSettings, this.settings);
        this.settings.task[this.projectId] = {};
        this.runSettingListeners(ComponentType.ALL);
    }

    public changeSetting(componentType: ComponentType, settingsPath: string, value?: any) {
        let settings;
        switch (componentType) {
            case ComponentType.MAIN:
                settings = this.settings.main;
                break;
            case ComponentType.OVERVIEW_TABLE:
                settings = this.settings.overviewTable;
                break;
            case ComponentType.LABELING:
                settings = this.settings.labeling;
                break;
            case ComponentType.TASK_HEADER:
                settings = this.settings.task;
                break;
        }
        if (!settings) return;
        const keyParts = settingsPath.split('.');
        const lastKey = keyParts.pop();
        for (const key of keyParts) {
            if (!settings[key]) return;
            settings = settings[key];
        }

        const currentValue = settings[lastKey];
        if (currentValue != value) {
            if (value === undefined) {
                if (typeof currentValue === "boolean") value = !currentValue;
                else throw Error("something isn't right")
            }
            settings[lastKey] = value;
            this.runSettingListeners(componentType);
        }
    }

    public switchToPage(page: ComponentType) {
        this.page = page;
    }

    private getDefaultLabelingSuiteSettings(): LabelingSuiteSettings {
        return {
            main: {
                autoNextRecord: false,
                hoverGroupBackgroundColor: "green",
                hoverGroupBackgroundColorClass: "bg-green-100",
            },
            overviewTable: {
                show: true,
                showHeuristics: false,
                includeLabelDisplaySettings: true,
            },
            task: {
                show: true,
                isCollapsed: false,
                alwaysShowQuickButtons: false,
            },
            labeling: {
                showNLabelButton: 5,
                showTaskNames: true,
                compactClassificationLabelDisplay: true,
                swimLaneExtractionDisplay: false,
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
            if (saveSettings) this.saveSettings();
            return;
        }
        if (!this.registeredSettingsListeners.has(type)) throw Error("Component type not available");

        if (type == ComponentType.MAIN) {
            this.settings.main.hoverGroupBackgroundColorClass = "bg-" + this.settings.main.hoverGroupBackgroundColor + "-200";
        }

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
        let taskSettings = this.settings.task[this.projectId][taskId];
        if (!taskSettings) {
            taskSettings = {};
            this.settings.task[this.projectId][taskId] = taskSettings;
        }
        let rlaSettings: LabelingSuiteTaskHeaderLabelSettings = taskSettings[rla.labelingTaskLabelId];
        if (!rlaSettings) {
            rlaSettings = this.getDefaultTaskOverviewLabelSettings();
            taskSettings[rla.labelingTaskLabelId] = rlaSettings;
        }
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
