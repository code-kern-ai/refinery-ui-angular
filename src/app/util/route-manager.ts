import { ActivatedRouteSnapshot, Router, RoutesRecognized } from "@angular/router";
import { timer } from "rxjs";
import { first } from "rxjs/operators";
import { ConfigManager } from "../base/services/config-service";
import { OrganizationApolloService } from "../base/services/organization/organization-apollo.service";





export class RouteManager {

    private static router: Router;
    private static organizationService: OrganizationApolloService;
    private static lastUrls: string[];
    private static startUrl: string;
    public static previousUrl: string; //


    //needs to be called once from app (because of the http injection)
    public static initRouteManager(router: Router, organizationService: OrganizationApolloService) {
        RouteManager.router = router;
        RouteManager.organizationService = organizationService;
        RouteManager.startUrl = router.url;
        RouteManager.previousUrl = router.url;
        RouteManager.lastUrls = [];
        RouteManager.initRouterListener();
    }


    private static initRouterListener() {
        if (!ConfigManager.isInit()) {
            timer(250).subscribe(() => RouteManager.initRouterListener());
            return;
        }
        this.router.events.subscribe((val) => {
            if (val instanceof RoutesRecognized) {

                const lastUrl = RouteManager.router.url;
                RouteManager.lastUrls.push(lastUrl);
                if (RouteManager.lastUrls?.length > 500) {
                    RouteManager.lastUrls.splice(0, 100)
                }
                if (ConfigManager.getConfigValue("allow_data_tracking")) {
                    const event = { old: lastUrl, new: val.url, name: this.getRecursiveRouteData(val.state.root) };
                    this.organizationService.postEvent("AppNavigation", JSON.stringify(event)).pipe(first()).subscribe();
                }
            }
        });
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
            if (RouteManager.lastUrls?.length > 0) {
                RouteManager.previousUrl = RouteManager.lastUrls[RouteManager.lastUrls.length - 1];
            }
            this.router.navigateByUrl(previous);
        }
        else this.router.navigateByUrl(RouteManager.startUrl);
    }

}

