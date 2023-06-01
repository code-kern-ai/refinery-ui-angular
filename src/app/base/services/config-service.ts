
import { HttpClient } from '@angular/common/http';
import { first } from 'rxjs/operators';
import { jsonCopy } from 'submodules/javascript-functions/general';

export class ConfigManager {

    private static config = null;
    private static http: HttpClient;
    private static isManaged: boolean = true;
    private static isAdmin: boolean = false;
    private static isDemo: boolean = false;
    private static blackWhiteListDemo: any;
    private static registeredUpdateListeners: Map<Object, () => void> = new Map<Object, () => void>();

    //needs to be called once from app (because of the http injection)
    public static initConfigManager(httpClient: HttpClient, isManaged: boolean) {
        ConfigManager.isManaged = isManaged;
        ConfigManager.http = httpClient;
        ConfigManager.refreshConfig();
    }

    public static refreshConfig() {
        ConfigManager.http.get('/config/base_config').pipe(first()).subscribe((c: string) => {
            ConfigManager.config = jsonCopy(c);
            ConfigManager.registeredUpdateListeners.forEach((func, key) => func.call(key));
        });
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
        ConfigManager.registeredUpdateListeners.set(caller, func);
    }
    public static unregisterUpdateAction(caller: Object) {
        ConfigManager.registeredUpdateListeners.delete(caller);
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

