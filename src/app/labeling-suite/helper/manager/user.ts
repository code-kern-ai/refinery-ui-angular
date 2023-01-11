import { UserRole } from "src/app/base/enum/graphql-enums";
import { getUserAvatarUri } from "src/app/util/helper-functions";
import { DoBeforeDestroy } from "src/app/util/interfaces";
import { UserManager } from "src/app/util/user-manager";


type UserData = {
    data: any;
    avatarUri: string;
    isLoggedInUser: boolean;
}


export class LabelingSuiteUserManager implements DoBeforeDestroy {
    public mainUser: UserData;
    public currentRole: UserRole;
    public allUsers: UserData[];

    constructor() {
        UserManager.registerAfterInitActionOrRun(this, this.prepareUserData, true);
    }

    doBeforeDestroy(): void {
        UserManager.unregisterRoleChangeListener(this);
        throw new Error("Method not implemented.");
    }


    private prepareUserData() {
        const user = UserManager.getUser();
        this.mainUser = {
            data: user,
            avatarUri: getUserAvatarUri(user),
            isLoggedInUser: true
        }
        this.allUsers = UserManager.getAllUsers().map(u => ({
            data: u,
            avatarUri: getUserAvatarUri(u),
            isLoggedInUser: u.id == this.mainUser.data.id
        }));
        UserManager.registerRoleChangeListenerAndRun(this, () => this.currentRole = UserManager.currentRole);
    }
}