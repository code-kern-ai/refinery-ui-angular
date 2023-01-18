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
export const ALL_USERS_USER_ID = "ALL_USERS_USER_ID"


export class LabelingSuiteUserManager implements DoBeforeDestroy {
    public mainUser: UserData;
    public currentRole: UserRole;
    public allUsers: UserData[];

    //list of users to switch through rla da
    public userIcons: any[];


    private _displayUserId: string;

    private baseManager: LabelingSuiteManager;

    public get displayUserId(): string {
        return this._displayUserId;
    }
    public set displayUserId(userId: string) {
        this._displayUserId = userId;
        this.baseManager.runUpdateListeners(UpdateType.DISPLAY_USER);
    }

    public get canEditManualRlas(): boolean {
        return (this.displayUserId == GOLD_STAR_USER_ID && this.currentRole == UserRole.ENGINEER) || this.displayUserId == this.mainUser.data.id;
    }

    constructor(baseManager: LabelingSuiteManager) {
        this.baseManager = baseManager;
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
        this._displayUserId = user.id;
        this.allUsers = UserManager.getAllUsers().map(u => ({
            data: u,
            avatarUri: getUserAvatarUri(u),
            isLoggedInUser: u.id == this.mainUser.data.id
        }));
        UserManager.registerRoleChangeListenerAndRun(this, () => this.currentRole = UserManager.currentRole);
    }


    public filterRlaDataForUser(rlaData: any[], rlaKey?: string): any[] {
        if (rlaKey) return rlaData.filter(entry => this.filterRlaCondition(entry[rlaKey]));
        return rlaData.filter(rla => this.filterRlaCondition(rla));
    }

    private filterRlaCondition(rla): boolean {
        if (this.currentRole != UserRole.ENGINEER) return rla.sourceType == LabelSource.MANUAL && rla.createdBy == this.displayUserId;
        if (rla.sourceType != LabelSource.MANUAL) return true;
        if (this.displayUserId == GOLD_STAR_USER_ID) return !!rla.isGoldStar;
        return rla.createdBy == this.displayUserId;
    }

    public prepareUserIcons(rlaData: any[]) {
        if (!this.allUsers) {
            timer(250).subscribe(() => this.prepareUserIcons(rlaData));
            return;
        }
        const dict = {}
        for (const rla of rlaData) {
            if (rla.sourceType != LabelSource.MANUAL) continue;
            if (rla.isGoldStar && !dict[GOLD_STAR_USER_ID]) {
                dict[GOLD_STAR_USER_ID] = { id: GOLD_STAR_USER_ID, order: 0, name: "Combined Gold Labels" };
            } else {
                const userId = rla.createdBy;
                if (!dict[userId]) {
                    const user = this.allUsers.find(u => u.data.id == userId);
                    if (!user || !user.data.firstName) {
                        dict[userId] = {
                            id: rla.createdBy,
                            order: 4,
                            name: 'Unknown User ID',
                            avatarUri: getUserAvatarUri(null)
                        };
                    } else {
                        dict[userId] = {
                            id: rla.createdBy,
                            order: rla.createdBy == this.mainUser.data.id ? 2 : 3,
                            name: user.data.firstName + ' ' + user.data.lastName,
                            avatarUri: user.avatarUri
                        };
                    }

                }
            }
        }

        if (Object.keys(dict).length > 1) {
            dict[ALL_USERS_USER_ID] = {
                id: ALL_USERS_USER_ID,
                order: 1,
                name: 'All Labels'
            };
        }

        this.userIcons = Object.values(dict);
        this.userIcons.sort((a, b) => a.order - b.order);
        console.log("user icons", this.userIcons, this.allUsers);

    }


}