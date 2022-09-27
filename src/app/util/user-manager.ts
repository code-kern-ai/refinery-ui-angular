import { Router } from "@angular/router";
import { first } from "rxjs/operators";
import { OrganizationApolloService } from "../base/services/organization/organization-apollo.service";




export class UserManager {

    private static router: Router;
    private static organizationService: OrganizationApolloService;
    private static user: any;
    private static actionsAfterInit: Map<Object, () => void> = new Map<Object, () => void>();
    private static actionsAfterUpdate: Map<Object, () => void> = new Map<Object, () => void>();


    //needs to be called once from app (because of the http injection)
    public static initUserManager(router: Router, organizationService: OrganizationApolloService, user: any) {
        UserManager.router = router;
        UserManager.organizationService = organizationService;
        UserManager.user = user;
        UserManager.actionsAfterInit.forEach((func, key) => func.call(key));
    }


    public static getUser(copy: boolean = true): any {
        if (!UserManager.isInit()) {
            console.log("UserManager not initialized - maybe register for after update?");
            return null;
        }
        if (copy) return { ...UserManager.user };
        return UserManager.user;
    }

    public static rerequestUser() {
        UserManager.user = null; //not longer init :) 
        UserManager.organizationService.getUserInfo().pipe(first()).subscribe((u: any) => {
            UserManager.user = u;
            UserManager.actionsAfterUpdate.forEach((func, key) => func.call(key));
        });
    }

    public static isInit(): boolean {
        return !!UserManager.router && !!UserManager.organizationService && !!UserManager.user;
    }
    public static registerAfterUpdateAction(caller: Object, func: () => void) {
        UserManager.actionsAfterUpdate.set(caller, func);
    }
    public static unregisterAfterUpdateAction(caller: Object) {
        UserManager.actionsAfterUpdate.delete(caller);
    }
    public static registerAfterInitAction(caller: Object, func: () => void) {
        UserManager.actionsAfterInit.set(caller, func);
    }
    public static unregisterAfterInitAction(caller: Object) {
        UserManager.actionsAfterInit.delete(caller);
    }

    public static checkUserAndRedirect(caller: Object, allowedRole: string = "ENGINEER") {
        if (!UserManager.isInit()) {
            UserManager.registerAfterInitAction(caller, () => {
                UserManager.checkUserAndRedirect(caller, allowedRole);
                UserManager.unregisterAfterInitAction(caller);
            }
            );
            return;
        }

        if (UserManager.user.role != allowedRole && UserManager.user.role != "ALL") {
            console.log("you shouldn't be here")
            UserManager.router.navigate(["projects"])
        }
    }

}

