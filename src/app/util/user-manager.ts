import { Router } from "@angular/router";
import { first } from "rxjs/operators";
import { OrganizationApolloService } from "../base/services/organization/organization-apollo.service";




export class UserManager {

    private static router: Router;
    private static organizationService: OrganizationApolloService;
    private static user: any;
    private static users: any[];
    private static actionsAfterBaseInit: Map<Object, () => void> = new Map<Object, () => void>();
    private static actionsAfterFullInit: Map<Object, () => void> = new Map<Object, () => void>();
    // private static actionsAfterUpdate: Map<Object, () => void> = new Map<Object, () => void>();


    //needs to be called once from app (because of the http injection)
    public static initUserManager(router: Router, organizationService: OrganizationApolloService, user: any) {
        UserManager.router = router;
        UserManager.organizationService = organizationService;
        UserManager.user = user;
        UserManager.organizationService.getOrganizationUsers().pipe(first()).subscribe((users: any[]) => {
            UserManager.users = users;
            UserManager.actionsAfterFullInit.forEach((func, key) => func.call(key));
        });
        UserManager.actionsAfterBaseInit.forEach((func, key) => func.call(key));


    }


    public static getUser(copy: boolean = true): any {
        if (!UserManager.isInit()) {
            console.log("UserManager not initialized - maybe register for after update?");
            return null;
        }
        if (copy) return { ...UserManager.user };
        return UserManager.user;
    }
    public static getAllUsers(copy: boolean = true): any {
        if (!UserManager.isInit()) {
            console.log("UserManager not initialized - maybe register for after update?");
            return null;
        }
        if (copy) return JSON.parse(JSON.stringify(UserManager.users));
        return UserManager.users;
    }

    // public static rerequestUser() {
    //     UserManager.user = null; //not longer init :) 
    //     UserManager.organizationService.getUserInfo().pipe(first()).subscribe((u: any) => {
    //         UserManager.user = u;
    //         UserManager.actionsAfterUpdate.forEach((func, key) => func.call(key));
    //     });
    // }
    // public static requestAllUsers() {
    //     UserManager.organizationService.getOrganizationUsers().pipe(first()).subscribe((users: any[]) => {
    //     });
    //     UserManager.user = null; //not longer init :) 
    //     UserManager.organizationService.getUserInfo().pipe(first()).subscribe((u: any) => {
    //         UserManager.user = u;
    //         UserManager.actionsAfterUpdate.forEach((func, key) => func.call(key));
    //     });
    // }

    private static isInit(): boolean {
        return !!UserManager.router && !!UserManager.organizationService && !!UserManager.user && !!UserManager.users;
    }
    // public static registerAfterUpdateAction(caller: Object, func: () => void) {
    //     UserManager.actionsAfterUpdate.set(caller, func);
    // }
    // public static unregisterAfterUpdateAction(caller: Object) {
    //     UserManager.actionsAfterUpdate.delete(caller);
    // }
    public static registerAfterInitAction(caller: Object, func: () => void, fullInit: boolean = false) {
        if (fullInit) UserManager.actionsAfterFullInit.set(caller, func);
        else UserManager.actionsAfterBaseInit.set(caller, func);
    }
    public static unregisterAfterInitAction(caller: Object) {
        if (UserManager.actionsAfterFullInit.has(caller)) UserManager.actionsAfterFullInit.delete(caller);
        if (UserManager.actionsAfterBaseInit.has(caller)) UserManager.actionsAfterBaseInit.delete(caller);
    }

    public static checkUserAndRedirect(caller: Object, allowedRole: string = "ENGINEER") {
        if (!UserManager.isInit()) {
            UserManager.registerAfterInitAction(caller, () => {
                UserManager.checkUserAndRedirect(caller, allowedRole);
                UserManager.unregisterAfterInitAction(caller);
            });
            return;
        }

        if (UserManager.user.role != allowedRole && UserManager.user.role != "ALL") {
            console.log("you shouldn't be here")
            UserManager.router.navigate(["projects"])
        }
    }

}

