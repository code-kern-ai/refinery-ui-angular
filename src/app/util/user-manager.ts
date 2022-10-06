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
            UserManager.actionsAfterFullInit.clear();
        });
        UserManager.actionsAfterBaseInit.forEach((func, key) => func.call(key));
        UserManager.actionsAfterBaseInit.clear();
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

    private static isInit(): boolean {
        return !!UserManager.router && !!UserManager.organizationService && !!UserManager.user && !!UserManager.users;
    }
    /**
     * Runs the given function after all init actions are done. If the manager is already initialized the function is called directly.
     * @param  {Object} caller  This object of under wich the functino is registered (usaully component object).
     * @callback  {()=>void)} func The function of the object that should be run.
     */
    public static registerAfterInitActionOrRun(caller: Object, func: () => void, fullInit: boolean = false) {
        if (UserManager.isInit()) {
            func.call(caller);
            return;
        }
        if (fullInit) UserManager.actionsAfterFullInit.set(caller, func);
        else UserManager.actionsAfterBaseInit.set(caller, func);
    }
    /**
      * Should almost never be used since the action/function is called and cleared after init.
      * @param  {Object} caller  This object of under wich the functino is registered (usaully component object).
      */
    public static unregisterAfterInitAction(caller: Object) {
        if (UserManager.actionsAfterFullInit.has(caller)) UserManager.actionsAfterFullInit.delete(caller);
        if (UserManager.actionsAfterBaseInit.has(caller)) UserManager.actionsAfterBaseInit.delete(caller);
    }

    public static checkUserAndRedirect(caller: Object, allowedRole: string = "ENGINEER") {
        if (!UserManager.isInit()) {
            UserManager.registerAfterInitActionOrRun(caller, () => {
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

