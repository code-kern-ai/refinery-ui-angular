import { Router } from "@angular/router";
import { first } from "rxjs/operators";
import { OrganizationApolloService } from "../base/services/organization/organization-apollo.service";


export function dateAsUTCDate(date: Date) {
    let d = new Date();
    d.setUTCFullYear(date.getFullYear());
    d.setUTCMonth(date.getMonth());
    d.setUTCDate(date.getDate());
    d.setUTCHours(date.getHours());
    d.setUTCMinutes(date.getMinutes());
    d.setUTCSeconds(date.getSeconds());
    d.setUTCMilliseconds(date.getMilliseconds());
    return d;
}

export function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(dm)) + ' ' + sizes[i];
}


export function checkUserAndRedirect(router: Router, user: any, allowedRole: string = "ENGINEER") {

    if (user.role != allowedRole && user.role != "ALL") {
        console.log("you shouldn't be here")
        router.navigate(["projects"])
    }
}
export function requestUserAndRedirect(router: Router, organizationService: OrganizationApolloService, allowedRole: string = "ENGINEER") {
    organizationService.getUserInfo().pipe(first()).subscribe((user) => checkUserAndRedirect(router, user, allowedRole));
}
