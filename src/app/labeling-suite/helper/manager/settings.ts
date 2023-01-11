import { enumToArray, loopNestedDict, transferNestedDict } from "src/app/util/helper-functions";
import { DoBeforeDestroy } from "src/app/util/interfaces";

export type LabelingSuiteSettings = {
    main: LabelingSuiteMainSettings;
    overviewTable: LabelingSuiteOverviewTableSettings;
}

export type LabelingSuiteOverviewTableSettings = {
    showHeuristics: boolean;
}
export type LabelingSuiteMainSettings = {
    autoNextRecord: boolean;
    showNLabelButton: number;
}

export enum ComponentType {
    ALL,
    MAIN,
    OVERVIEW_TABLE,
    LABELING,
    TASK_HEADER,
}

// function lookupComponentKey(comp: ComponentType): string {
//     switch (comp) {
//         case ComponentType.OVERVIEW_TABLE: return 'overviewTable';
//         case ComponentType.MAIN: return 'main';
//         default: return null;
//     }
// }

export class LabelingSuiteSettingManager implements DoBeforeDestroy {
    static localStorageKey = "labelingSuiteSettings";
    public settings: LabelingSuiteSettings;

    private registeredSettingsListeners: Map<ComponentType, Map<Object, () => void>> = new Map<ComponentType, Map<Object, () => void>>();

    constructor() {
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
        }
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
                showNLabelButton: 5,
            },
            overviewTable: {
                showHeuristics: false,
            }
        }
    }


    // public changeSetting(type: ComponentType, key: string, value: any) {
    //     if (type == ComponentType.ALL) this.settings = value;
    //     else {
    //         let compKey = lookupComponentKey(type);
    //         if (!compKey) throw Error("Component type has no settings");
    //         this.settings[compKey][key] = value;
    //     }
    //     this.runSettingListeners(type);
    // }

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

    public runSettingListeners(type: ComponentType) {
        if (!this.registeredSettingsListeners.has(type)) throw Error("Component type not available");
        if (this.registeredSettingsListeners.get(type).size == 0) return;
        this.registeredSettingsListeners.get(type).forEach((func, key) => func.call(key));
    }
}
