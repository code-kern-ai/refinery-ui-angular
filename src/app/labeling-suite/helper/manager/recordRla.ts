import { getLabelSourceOrder, InformationSourceReturnType, informationSourceTypeToString, LabelSource, labelSourceToString, UserRole } from "src/app/base/enum/graphql-enums";
import { jsonCopy } from "src/app/util/helper-functions";
import { TableDisplayData } from "../../sub-components/overview-table/helper";
import { getHoverGroupsForLabeling, getHoverGroupsOverviewTable } from "../util-functions";
import { LabelingSuiteManager } from "./manager";
import { GOLD_STAR_USER_ID } from "./user";

export class LabelingSuiteRlaPreparator {

    private rlas: any[];
    private baseManager: LabelingSuiteManager;

    constructor(baseManager: LabelingSuiteManager) {
        this.baseManager = baseManager;
    }

    public setRlas(rlas: any, tokenAttribute: any) {
        if (!rlas) {
            this.rlas = null;
            return;
        }
        const rlaData = this.prepareRLADataForRole(jsonCopy(rlas));
        this.rlas = this.finalizeRlas(rlaData, tokenAttribute);
    }

    public rlasLoaded(): boolean {
        return this.rlas != null;
    }


    private finalizeRlas(rlas: any[], tokenAttribute: any): any[] {
        if (!rlas) return [];
        for (const e of rlas) {
            if (e.returnType == InformationSourceReturnType.RETURN) continue;
            const attributeId = e.labelingTaskLabel.labelingTask.attribute.id;
            let att = this.getTokenizedAttribute(attributeId, tokenAttribute);
            let t1 = this.getToken(att, e.tokenStartIdx);
            let t2 = this.getToken(att, e.tokenEndIdx);
            e.value = att.raw.substring(t1.posStart, t2.posEnd);
        }
        return rlas;
    }


    private prepareRLADataForRole(rlaData: any[]): any[] {
        if (this.baseManager.userManager.currentRole != UserRole.ANNOTATOR) return rlaData;
        const currentSourceId = this.baseManager.sessionManager.getSourceId();
        const userId = this.baseManager.userManager.displayUserId;
        const allowedTask = this.baseManager.sessionManager.getAllowedTaskId();
        rlaData.forEach((rla) => {
            if ((rla.sourceId && rla.sourceId == currentSourceId)) {
                rla.sourceType = LabelSource.MANUAL;
                rla.sourceId = null;
            } else if (this.baseManager.userManager.roleAssumed && rla.createdBy == userId && rla.labelingTaskLabel.labelingTask.id == allowedTask
                && rla.sourceType == LabelSource.MANUAL) {
                // nothing to change (no deletion flag or modify of existing types)
            } else {
                rla.id = "x";
            }
        });
        return rlaData.filter(rla => rla.id != "x");
    }

    private getTokenizedAttribute(attributeId: string, tokenAttribute: any): any {
        for (let att of tokenAttribute) {
            if (att.attributeId == attributeId) return att;
        }
        return null;
    }

    private getToken(tokenizedAttribute, idx: number): any {
        for (let token of tokenizedAttribute.token) {
            if (token.idx == idx) return token;
        }
        return null;
    }

    public rlasHaveHeuristicData(): boolean {
        if (!this.rlas) return false;
        for (const el of this.rlas) {
            if (el.sourceType == LabelSource.INFORMATION_SOURCE) return true;
        }
        return false;
    }

    public buildLabelingRlaData(): any[] {
        if (!this.rlas) return [];
        let result = Array(this.rlas.length);
        let i = 0;
        for (let e of this.rlas) {
            result[i++] = {
                hoverGroups: getHoverGroupsForLabeling(e),
                sourceTypeKey: e.sourceType,
                orderPos: getLabelSourceOrder(e.sourceType, e.informationSource?.type),
                labelId: e.labelingTaskLabelId,
                labelName: e.labelingTaskLabel.name,
                taskId: e.labelingTaskLabel.labelingTask.id,
                createdBy: e.isGoldStar ? GOLD_STAR_USER_ID : e.createdBy,
                createdByName: this.getCreatedByName(e),
                confidence: e.confidence,
                dataTip: this.getLabelDataTip(e),
                labelDisplay: this.getLabelForDisplay(e),
                icon: this.getIcon(e),
                canBeDeleted: this.baseManager.userManager.canDeleteRla(e),
                rla: e
            };
        }
        result.sort((a, b) => a.orderPos - b.orderPos || a.createdByName.localeCompare(b.createdByName) || a.labelName.localeCompare(b.labelName));
        return result;

    }

    public buildOverviewTableDisplayArray(): TableDisplayData[] {
        if (!this.rlas) return [];
        let result = Array(this.rlas.length);
        let i = 0;
        for (let e of this.rlas) {
            result[i++] = {
                hoverGroups: getHoverGroupsOverviewTable(e),
                orderPos: getLabelSourceOrder(e.sourceType, e.informationSource?.type),
                orderPosSec: this.getOrderPos(e),
                sourceType: this.getSourceTypeText(e),
                sourceTypeKey: e.sourceType,
                taskName: e.labelingTaskLabel.labelingTask.name,
                createdBy: this.getCreatedByName(e),
                label: this.getLabelData(e),
                canBeDeleted: this.baseManager.userManager.canDeleteRla(e),
                rla: e
            };
        }
        result.sort((a, b) => a.orderPos - b.orderPos || a.orderPosSec - b.orderPosSec || a.createdBy.localeCompare(b.createdBy) || a.label.name.localeCompare(b.label.name));
        return result;
    }

    private getOrderPos(e: any): number {
        let pos = e.labelingTaskLabel.labelingTask.attribute?.relativePosition * 1000;
        if (!pos) pos = 100000;
        pos += e.tokenStartIdx;
        return pos;
    }
    private getSourceTypeText(e: any): string {
        if (e.sourceType == LabelSource.INFORMATION_SOURCE) return informationSourceTypeToString(e.informationSource.type, false);
        let final = labelSourceToString(e.sourceType);
        if (e.isGoldStar) final += ' gold ⭐';
        return final;
    }

    private getCreatedByName(e: any): string {
        if (e.sourceType == LabelSource.INFORMATION_SOURCE) return e.informationSource.name;
        if (!e.createdBy || e.createdBy == "NULL") return '-';
        else if (!e.user?.firstName) return 'Unknown User ID';
        else {
            return e.user.firstName + ' ' + e.user.lastName;
        }
    }

    private getLabelData(e: any): any {
        let value = e.value;
        if (value) value = '(' + value + ')';
        const color = e.labelingTaskLabel.color
        return {
            name: e.labelingTaskLabel.name,
            value: value,
            backgroundColor: 'bg-' + color + '-100',
            textColor: 'text-' + color + '-700',
            borderColor: 'border-' + color + '-400',
        }
    }

    private getLabelDataTip(e: any): string {
        if (e.sourceType == LabelSource.INFORMATION_SOURCE) return informationSourceTypeToString(e.informationSource.type, false);
        else if (e.sourceType == LabelSource.WEAK_SUPERVISION) return "Weak supervision - click to use as manual label";
        else if (e.sourceType == LabelSource.MANUAL) return "Manual";
        return null;
    }

    private getLabelForDisplay(e: any): string {
        let final = e.labelingTaskLabel.name;
        if (e.sourceType == LabelSource.WEAK_SUPERVISION && e.confidence != null) {
            final += " - " + Math.round((e.confidence + Number.EPSILON) * 10000) / 100 + '%';
        } else if (this.baseManager.settingManager.settings.labeling.showHeuristicConfidence && e.sourceType == LabelSource.INFORMATION_SOURCE && e.confidence != null) {
            final += " - " + Math.round((e.confidence + Number.EPSILON) * 10000) / 100 + '%';
        }
        return final;
    }

    public rebuildRLALabelDisplay(rlas: any[], rlaKey?: string) {
        if (!rlas) return;
        for (let e of rlas) {
            if (rlaKey && e[rlaKey]) {
                e.labelDisplay = this.getLabelForDisplay(e[rlaKey]);
            } else {
                e.labelDisplay = this.getLabelForDisplay(e);
            }
        }
    }

    private getIcon(e: any): string {
        if (e.sourceType == LabelSource.INFORMATION_SOURCE) return e.informationSource.type;
        else if (e.sourceType != LabelSource.MANUAL) return e.sourceType;
        return null;
    }
}