import { ActivatedRouteSnapshot, Router, RoutesRecognized } from "@angular/router";
import { timer } from "rxjs";
import { first } from "rxjs/operators";
import { ConfigManager } from "../base/services/config-service";
import { OrganizationApolloService } from "../base/services/organization/organization-apollo.service";





export class RouteManager {

    private static router: Router;
    private static organizationService: OrganizationApolloService;
    private static lastUrls: string[];
    private static startUrl: string = "/";
    public static currentUrl: string;
    private static actionsAfterRouteRecognized: Map<Object, (val: RoutesRecognized) => void> = new Map<Object, (val: RoutesRecognized) => void>();

    public static routeColor = {
        overview: { active: false, checkFor: ['overview'] },
        data: { active: false, checkFor: ['data', 'edit-records'] },
        labeling: { active: false, checkFor: ['labeling', 'record-ide'] },
        heuristics: { active: false, checkFor: ['heuristics', 'lookup-lists', 'model-callbacks', 'zero-shot', 'crowd-labeler'] },
        settings: { active: false, checkFor: ['settings', 'attributes', 'upload-records'] },
        admin: { active: false, checkFor: ['admin'] },
    }

    public static currentPage: string;

    //needs to be called once from app (because of the http injection)
    public static initRouteManager(router: Router, organizationService: OrganizationApolloService) {
        RouteManager.router = router;
        RouteManager.organizationService = organizationService;
        RouteManager.lastUrls = [];
        RouteManager.initRouterListener();
    }


    private static initRouterListener() {
        if (!ConfigManager.isInit()) {
            timer(250).subscribe(() => RouteManager.initRouterListener());
            return;
        }
        RouteManager.router.events.subscribe((val) => {
            if (val instanceof RoutesRecognized) {
                RouteManager.currentUrl = val.url;
                const lastUrl = RouteManager.router.url;
                RouteManager.lastUrls.push(lastUrl);
                if (RouteManager.lastUrls?.length > 500) {
                    RouteManager.lastUrls.splice(0, 100)
                }
                if (ConfigManager.getConfigValue("allow_data_tracking")) {
                    const event = { old: lastUrl, new: val.url, name: this.getRecursiveRouteData(val.state.root) };
                    RouteManager.organizationService.postEvent("AppNavigation", JSON.stringify(event)).pipe(first()).subscribe();
                }
                RouteManager.checkRouteHighlight(val.url);
                RouteManager.actionsAfterRouteRecognized.forEach((value, key) => value.call(this, val));
            }
        });
        RouteManager.checkRouteHighlight(RouteManager.router.url);
    }


    private static getRecursiveRouteData(root: ActivatedRouteSnapshot, key: string = 'name') {
        if (root.firstChild) {
            return this.getRecursiveRouteData(root.firstChild)
        }
        return root.data[key]
    }

    public static moveBack() {
        const previous = RouteManager.lastUrls.pop();
        if (previous) {
            this.router.navigateByUrl(previous);
        }
        else this.router.navigateByUrl(RouteManager.startUrl);
    }

    private static checkRouteHighlight(url: string) {
        url = url.split('?')[0];
        RouteManager.currentPage = '';
        for (const key in RouteManager.routeColor) {
            RouteManager.routeColor[key].active = RouteManager.routeColor[key].checkFor.some(s => url.includes(s));
            if (!RouteManager.currentPage && RouteManager.routeColor[key].active) {
                for (const checkFor of RouteManager.routeColor[key].checkFor) {
                    if (url.includes(checkFor)) {
                        RouteManager.currentPage = checkFor;
                        break;
                    }
                }
            }
        }
    }


    public static subscribeToRoutesRecognized(key: Object, func: (val: RoutesRecognized) => void) {
        if (RouteManager.actionsAfterRouteRecognized.has(key)) {
            RouteManager.actionsAfterRouteRecognized.delete(key);
        }
        RouteManager.actionsAfterRouteRecognized.set(key, func);
    }
    public static unsubscribeFromRoutesRecognized(key: Object) {
        if (RouteManager.actionsAfterRouteRecognized.has(key)) {
            RouteManager.actionsAfterRouteRecognized.delete(key);
        }
    }

}

