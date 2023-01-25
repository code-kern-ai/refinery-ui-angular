import { timer } from "rxjs";
import { LabelSource, UserRole } from "src/app/base/enum/graphql-enums";
import { getUserAvatarUri } from "src/app/util/helper-functions";
import { DoBeforeDestroy } from "src/app/util/interfaces";
import { UserManager } from "src/app/util/user-manager";
import { LabelingSuiteManager, UpdateType } from "./manager";


type UserData = {
    data: any;
    avatarUri: string;
    isLoggedInUser: boolean;
}
export const GOLD_STAR_USER_ID = "GOLD_STAR"
export const ALL_USERS_USER_ID = "ALL_USERS"
export enum UserType {
    GOLD,
    ALL,
    REGISTERED
}

export class LabelingSuiteUserManager implements DoBeforeDestroy {
    public mainUser: UserData;
    public currentRole: UserRole;
    public allUsers: UserData[];

    //list of users to switch through rla data
    public userIcons: any[];
    public showUserIcons: boolean = false;

    public absoluteWarning: string;

    private _displayUserId: string;

    private baseManager: LabelingSuiteManager;

    public get displayUserId(): string {
        return this._displayUserId;
    }
    public set displayUserId(userId: string) {
        this._displayUserId = userId;
        if (this.userIcons) this.userIcons.forEach(icon => icon.active = icon.id == userId);
        this.baseManager.runUpdateListeners(UpdateType.DISPLAY_USER);
    }
    public get roleAssumed(): boolean {
        return this.currentRole != this.mainUser.data.role;
    }

    public get canEditManualRlas(): boolean {
        if (this.roleAssumed) return false;
        return (this.displayUserId == GOLD_STAR_USER_ID && this.currentRole == UserRole.ENGINEER)
            || (this.displayUserId == ALL_USERS_USER_ID && this.currentRole == UserRole.ENGINEER)
            || this.displayUserId == this.mainUser.data.id;
    }

    constructor(baseManager: LabelingSuiteManager) {
        this.baseManager = baseManager;
    }
    public finishUpSetup() {
        UserManager.registerAfterInitActionOrRun(this, this.prepareUserData, true);
    }

    doBeforeDestroy(): void {
        UserManager.unregisterRoleChangeListener(this);
    }


    private prepareUserData() {
        const user = UserManager.getUser();
        this.mainUser = {
            data: user,
            avatarUri: getUserAvatarUri(user),
            isLoggedInUser: true
        }
        if (!this._displayUserId) this._displayUserId = user.id;
        this.allUsers = UserManager.getAllUsers().map(u => ({
            data: u,
            avatarUri: getUserAvatarUri(u),
            isLoggedInUser: u.id == this.mainUser.data.id
        }));
        UserManager.registerRoleChangeListenerAndRun(this, this.changeCurrentRole);
        this.baseManager.setupAfterUserInit();
    }

    private changeCurrentRole() {
        this.currentRole = UserManager.currentRole;
        this.absoluteWarning = this.roleAssumed ? 'You are viewing this page as ' + this.currentRole + ' you are not able to edit' : null;
        this.baseManager.checkAbsoluteWarning();
    }


    public filterRlaDataForUser(rlaData: any[], rlaKey?: string): any[] {
        if (rlaKey) return rlaData.filter(entry => this.filterRlaCondition(entry[rlaKey]));
        return rlaData.filter(rla => this.filterRlaCondition(rla));
    }

    private filterRlaCondition(rla): boolean {
        if (this.currentRole != UserRole.ENGINEER) return rla.sourceType == LabelSource.MANUAL && rla.createdBy == this.displayUserId;
        if (rla.sourceType != LabelSource.MANUAL) return true;
        if (this.displayUserId == ALL_USERS_USER_ID) return true;
        if (!!rla.isGoldStar) return this.displayUserId == GOLD_STAR_USER_ID;
        return rla.createdBy == this.displayUserId;
    }

    public canDeleteRla(rla): boolean {
        if (rla.sourceType != LabelSource.MANUAL) return false;
        if (this.currentRole != UserRole.ENGINEER) return false;
        if (rla.isGoldStar) return true;
        return rla.createdBy == this.mainUser.data.id;
    }
    public selectUserByIdx(idx: number) {
        if (!this.showUserIcons) return;
        if (idx >= this.userIcons.length) return;
        this.displayUserId = this.userIcons[idx].id;
        if (this.displayUserId == GOLD_STAR_USER_ID && this.baseManager.modalManager.modals.goldStar.firstVisit) {
            this.baseManager.modalManager.modals.goldStar.open = true;
            this.baseManager.modalManager.modals.goldStar.firstVisit = false;
        }
    }


    public prepareUserIcons(rlaData: any[]) {
        if (!this.allUsers) {
            timer(250).subscribe(() => this.prepareUserIcons(rlaData));
            return;
        }
        const dict = {}

        dict[this.mainUser.data.id] = {
            id: this.mainUser.data.id,
            order: 2,
            name: this.mainUser.data.firstName + ' ' + this.mainUser.data.lastName,
            userType: UserType.REGISTERED,
            avatarUri: this.mainUser.avatarUri,
            active: this._displayUserId == this.mainUser.data.id
        };
        for (const rla of rlaData) {
            if (rla.sourceType != LabelSource.MANUAL) continue;
            if (rla.isGoldStar && !dict[GOLD_STAR_USER_ID]) {
                dict[GOLD_STAR_USER_ID] = {
                    id: GOLD_STAR_USER_ID,
                    order: 0,
                    name: "Combined gold labels",
                    userType: UserType.GOLD,
                    active: false,
                };
            } else {
                const userId = rla.createdBy;
                if (!dict[userId]) {
                    const user = this.allUsers.find(u => u.data.id == userId);
                    if (!user || !user.data.firstName) {
                        dict[userId] = {
                            id: rla.createdBy,
                            order: 4,
                            name: 'Unknown User ID',
                            userType: UserType.REGISTERED,
                            avatarUri: getUserAvatarUri(null),
                            active: this._displayUserId == rla.createdBy
                        };
                    } else {
                        dict[userId] = {
                            id: rla.createdBy,
                            order: rla.createdBy == this.mainUser.data.id ? 2 : 3,
                            name: user.data.firstName + ' ' + user.data.lastName,
                            userType: UserType.REGISTERED,
                            avatarUri: user.avatarUri,
                            active: this._displayUserId == rla.createdBy
                        };
                    }

                }
            }
        }

        if (Object.keys(dict).length > 1) {
            dict[ALL_USERS_USER_ID] = {
                id: ALL_USERS_USER_ID,
                order: 1,
                name: 'All users',
                userType: UserType.ALL,
                active: false
            };
        }
        this.userIcons = Object.values(dict);
        this.userIcons.sort((a, b) => a.order - b.order);
        let c = 1;
        this.userIcons.forEach(u => u.name += ' [' + c++ + ']')
        this.showUserIcons = this.userIcons.length > 1;
        if (this.userIcons.length > 10) console.log("warning: more than 10 users on this record");

    }


}