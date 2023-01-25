import { first } from "rxjs/operators";
import { NotificationService } from "src/app/base/services/notification.service";
import { ProjectApolloService } from "src/app/base/services/project/project-apollo.service";
import { AttributeVisibility } from "src/app/projects/components/create-new-attribute/attributes-visibility-helper";
import { enumToArray, transferNestedDict } from "src/app/util/helper-functions";
import { DoBeforeDestroy } from "src/app/util/interfaces";
import { LabelingSuiteManager, UpdateType } from "./manager";



export class LabelingSuiteAttributeManager implements DoBeforeDestroy {

    public attributes: any[];
    //only for debugging purposes
    private fullAttributes: any[];

    private baseManager: LabelingSuiteManager;
    private projectApolloService: ProjectApolloService;
    private projectId: string;


    // private registeredSettingsListeners: Map<ComponentType, Map<Object, () => void>> = new Map<ComponentType, Map<Object, () => void>>();

    constructor(projectId: string, projectApolloService: ProjectApolloService, baseManager: LabelingSuiteManager) {
        this.projectId = projectId;
        this.projectApolloService = projectApolloService;
        this.baseManager = baseManager;

        NotificationService.subscribeToNotification(this, {
            projectId: this.projectId,
            whitelist: this.getWebsocketWhitelist(),
            func: this.handleWebsocketNotification
        });
        this.fetchAttributes();
    }

    doBeforeDestroy(): void {
        NotificationService.unsubscribeFromNotification(this, this.projectId);
    }

    private getWebsocketWhitelist(): string[] {
        let toReturn = ['attributes_updated', 'calculate_attribute'];
        return toReturn;
    }

    private handleWebsocketNotification(msgParts: string[]) {
        if (msgParts[1] == 'attributes_updated' || (msgParts[1] == 'calculate_attribute' && msgParts[2] == 'created')) {
            this.fetchAttributes();
        }
        else {
            console.log("unknown message in LabelingSuite Attribute Manager: " + msgParts);
        }

    }

    private fetchAttributes() {
        let q, vc;
        [q, vc] = this.projectApolloService.getAttributesByProjectId(this.projectId);
        vc.pipe(first()).subscribe(att => {
            this.fullAttributes = att;
            this.attributes = att.filter((a) => a.visibility == AttributeVisibility.DO_NOT_HIDE || a.visibility == AttributeVisibility.HIDE_ON_DATA_BROWSER);
            this.attributes.sort((a, b) => a.relativePosition - b.relativePosition);
            this.baseManager.runUpdateListeners(UpdateType.ATTRIBUTES);
        });
    }


}