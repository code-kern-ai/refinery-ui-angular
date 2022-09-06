
import { HttpClient } from '@angular/common/http';
import { first } from 'rxjs/operators';
import { ConfigApolloService } from './config/config-apollo.service';

export class ConfigManager {

    private static config = null;
    private static http: HttpClient;
    private static configApolloService: ConfigApolloService;
    private static isManaged: boolean = true;//differentation between propriatary or not
    private static isAdmin: boolean = false;
    private static isDemo: boolean = false;
    private static blackWhiteListDemo: any;
    private static registedUpdateListeners: Map<Object, () => void> = new Map<Object, () => void>();
    private static justUpdated = false;

    //needs to be called once from app (because of the http injection)
    public static initConfigManager(httpClient: HttpClient, configApolloService: ConfigApolloService, isManaged: boolean) {
        ConfigManager.isManaged = isManaged;
        ConfigManager.http = httpClient;
        ConfigManager.configApolloService = configApolloService;
        ConfigManager.refreshConfig();
    }

    public static refreshConfig() {
        ConfigManager.http.get('/config/base_config').pipe(first()).subscribe((c: string) => {

            ConfigManager.config = JSON.parse(c);
            ConfigManager.checkAndUpdateLocalStorage(c);
            ConfigManager.registedUpdateListeners.forEach((func, key) => func.call(key));
        });
    }

    private static checkAndUpdateLocalStorage(currentConfig: string) {
        //only open source / local can update these values
        if (ConfigManager.isManaged) return;
        let parsed = JSON.parse(currentConfig);
        delete parsed["KERN_S3_ENDPOINT"]
        currentConfig = JSON.stringify(parsed)
        let localStorageConfig = localStorage.getItem("base_config");
        if (localStorageConfig) {
            parsed = JSON.parse(localStorageConfig);
            delete parsed["KERN_S3_ENDPOINT"]
            localStorageConfig = JSON.stringify(parsed)
        }
        let newConfig = true;
        if (localStorageConfig && localStorageConfig != currentConfig && !ConfigManager.justUpdated) {
            const update = window.confirm("Your local storage has a different set of config values.\nThis can happen if the config service was reinitialized\n\nDo you want to update to the previous version?\n\nNew keys won't be affected.");
            if (update) {
                ConfigManager.configApolloService.updateConfig(localStorageConfig).pipe(first()).subscribe(o => {
                    if (!o?.data?.updateConfig) window.alert('something went wrong with the update');
                    else ConfigManager.justUpdated = true;
                });
                newConfig = false;
            }
        }
        if (newConfig) {
            localStorage.setItem('base_config', currentConfig);
            ConfigManager.justUpdated = false;
        }
    }

    public static getConfigValue(key: string, subkey: string = null): string | any {
        if (!ConfigManager.config) ConfigManager.refreshConfig();
        const value = ConfigManager.config[key];
        if (!subkey) return value;
        return ConfigManager.config[key][subkey]
    }

    public static getIsManaged(ignoreCheck: boolean = false): boolean {
        if (!ignoreCheck && !ConfigManager.isInit()) console.log("ConfigManager not initialized");
        return ConfigManager.isManaged;
    }

    public static isInit(): boolean {
        return !!ConfigManager.http && ConfigManager.config;
    }

    public static registerUpdateAction(caller: Object, func: () => void) {
        ConfigManager.registedUpdateListeners.set(caller, func);
    }
    public static unregisterUpdateAction(caller: Object) {
        ConfigManager.registedUpdateListeners.delete(caller);
    }

    public static setIsAdmin(value: boolean) {
        ConfigManager.isAdmin = value;
    }
    public static getIsAdmin(ignoreCheck: boolean = false): boolean {
        if (!ignoreCheck && !ConfigManager.isInit()) console.log("ConfigManager not initialized");
        return ConfigManager.isAdmin;
    }

    public static setIsDemo(value: boolean) {
        ConfigManager.isDemo = value;
    }
    public static getIsDemo(ignoreCheck: boolean = false): boolean {
        if (!ignoreCheck && !ConfigManager.isInit()) console.log("ConfigManager not initialized");
        return ConfigManager.isDemo;
    }

    public static setBlackWhiteListDemo(value: any) {
        ConfigManager.blackWhiteListDemo = value;
    }

    public static checkBlackWhiteList(type: string, queryText: string): boolean {
        if (!ConfigManager.blackWhiteListDemo) return false;
        if (type == "query") {
            for (const blacklisted of ConfigManager.blackWhiteListDemo["queries"]) {
                if (queryText.indexOf(blacklisted) != -1) return false;
            }
            return true;
        } else {
            for (const whitelisted of ConfigManager.blackWhiteListDemo["mutations"]) {
                if (queryText.indexOf(whitelisted) != -1) return true;
            }
            return false;
        }
    }
}

