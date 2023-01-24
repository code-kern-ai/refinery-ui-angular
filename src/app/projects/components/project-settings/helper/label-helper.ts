import { Subject, timer } from "rxjs";
import { first } from "rxjs/operators";
import { ProjectApolloService } from "src/app/base/services/project/project-apollo.service";
import { ProjectSettingsComponent } from "../project-settings.component";



export class LabelHelper {
    private settings: ProjectSettingsComponent;
    private projectApolloService: ProjectApolloService;
    private static ALLOWED_KEYS = "abcdefghijklmnopqrstuvwxyzöäüß<>|,.;:-_#'\"~+*?\\{}[]()=/&%$§!@^°€";

    public labelColorOptions = []

    public colorOptions = [
        "red", "orange", "amber",
        "yellow", "lime", "green",
        "emerald", "teal", "cyan",
        "sky", "blue", "indigo",
        "violet", "purple", "fuchsia",
        "pink", "rose"];

    public modalOpen: LabelModals = {
        changeColor: false,
        changeName: false
    };

    public currentLabel: CurrentLabel = null;
    public labelingTaskColors: Map<string, string[]> = new Map<string, string[]>(); //still needed?
    public labelHotkeyError: string;
    public labelMap: Map<string, []> = new Map<string, []>();

    // public renameCheckResults: any;
    public renameLabelData: RenameLabelData;

    constructor(settings: ProjectSettingsComponent, projectApolloService: ProjectApolloService) {
        this.settings = settings;
        this.projectApolloService = projectApolloService;
        this.colorOptions.forEach(color => this.labelColorOptions.push(this.getColorStruct(color)));
    }

    public setLabelMap(tasks: any[]) {
        this.labelMap.clear();
        tasks.forEach((task) => {
            task.labels.sort((a, b) => a.name.localeCompare(b.name));
            task.labels = task.labels.map((label) => this.extendLabelForColor({ ...label }));
            this.labelMap.set(task.id, task.labels);
        });
    }

    public addLabel(
        projectId: string,
        taskId: string,
        labelInput: HTMLInputElement,
        timeOutWrapper: { requestTimeOut: boolean }
    ): void {
        if (timeOutWrapper.requestTimeOut) return;
        if (!labelInput.value) return;
        if (!this.isLabelNameUnique(taskId, labelInput.value)) return;
        let labelColor = "yellow"
        let colorsInTask = this.labelingTaskColors.get(taskId);
        if (colorsInTask.length > 0) {
            const availableColors = this.colorOptions.filter(x => !colorsInTask.includes(x));
            if (availableColors.length > 0) {
                labelColor = availableColors[0]
                colorsInTask.push(labelColor);
                this.labelingTaskColors.set(taskId, colorsInTask);
            }
        } else {
            this.labelingTaskColors.set(taskId, [labelColor])
        }
        this.projectApolloService
            .createLabel(projectId, taskId, labelInput.value, labelColor).pipe(first())
            .subscribe();

        labelInput.value = '';
        labelInput.focus();

        timeOutWrapper.requestTimeOut = true;
        timer(100).subscribe(() => {
            timeOutWrapper.requestTimeOut = false;
        });
    }

    public checkRenameLabel() {
        if (!this.renameLabelData.canCheck || !this.renameLabelData.newLabelName) return;
        this.renameLabelData.checkResults = null;

        this.projectApolloService
            .checkRenameLabel(this.settings.project.id, this.currentLabel.label.id, this.renameLabelData.newLabelName.trim()).pipe(first())
            .subscribe((r) => {
                r.warnings.forEach(e => {
                    e.open = false;
                    e.oldParsed = this.prepareSourceCode(e.old, e.information_source_name);
                    e.newParsed = this.prepareSourceCode(e.new, e.information_source_name);
                });
                this.renameLabelData.checkResults = r;
            });
    }

    public updateLabelName() {
        this.projectApolloService
            .updateLabelName(this.settings.project.id, this.currentLabel.label.id, this.renameLabelData.newLabelName.trim()).pipe(first())
            .subscribe((x) => this.currentLabel.label.name = this.renameLabelData.newLabelName.trim());
    }

    public handleLabelRenameWarning(warning: any) {
        if (warning == null) return;
        this.projectApolloService
            .handleLabelRenameWarning(this.settings.project.id, JSON.stringify(warning)).pipe(first())
            .subscribe((x) => this.checkRenameLabel());
    }


    public extendLabelForColor(label: any): any {
        if (label.color) label.color = this.getColorStruct(label.color);
        return label;
    }

    private getColorStruct(color: string): LabelColors {
        return {
            name: color,
            backgroundColor: LabelHelper.getBackgroundColor(color),
            textColor: LabelHelper.getTextColor(color),
            borderColor: LabelHelper.getBorderColor(color),
            hoverColor: LabelHelper.getHoverColor(color)
        }
    }
    public setCurrentLabel(label: any, labelingTaskId: string) {
        this.currentLabel = { label: label, taskId: labelingTaskId };
        this.modalOpen.changeColor = true;
    }
    public openRenameLabel() {
        this.modalOpen.changeColor = false;
        this.modalOpen.changeName = true;
        this.renameLabelData = {
            checkResults: null,
            newLabelName: '',
            canCheck: false
        };
    }
    public checkInputRenameLabel(event: InputEvent) {
        const input = event.target as HTMLInputElement;
        this.renameLabelData.checkResults = null;
        this.renameLabelData.canCheck = this.isValidNewName(input.value);
        if (this.renameLabelData.canCheck && !this.isLabelNameUnique(this.currentLabel.taskId, input.value)) {
            this.renameLabelData.canCheck = false;
            this.renameLabelData.checkResults = { "errors": [{ "msg": "Label with name already exists" }], "warnings": [], "infos": [] };
        }
        this.renameLabelData.newLabelName = input.value;
    }
    private isValidNewName(name: string): boolean {
        if (!name) return false;
        if (name.trim() == '') return false;
        return true;
    }

    public clearCurrentLabel() {
        //delay to prevent issues with label display on closing modal
        timer(250).subscribe(() => {
            this.currentLabel = null;
            this.labelHotkeyError = '';
            this.renameLabelData = null;
        })
        this.modalOpen.changeColor = false;
        this.modalOpen.changeName = false;
    }


    public updateLabelColor(projectId: string, labelingTaskId: string, labelId: string, oldLabelColor: string, newLabelColor: any) {
        let colorsInTask = this.labelingTaskColors.get(labelingTaskId);
        const index = colorsInTask.indexOf(oldLabelColor);
        if (index > -1) {
            colorsInTask.splice(index, 1); // 2nd parameter means remove one item only
        }
        colorsInTask.push(newLabelColor.name);
        this.labelingTaskColors.set(labelingTaskId, colorsInTask);

        this.projectApolloService
            .updateLabelColor(projectId, labelId, newLabelColor.name).pipe(first())
            .subscribe();
        this.currentLabel.label.color = newLabelColor;
    }
    public checkAndSetLabelHotkey(event: KeyboardEvent) {
        this.labelHotkeyError = null;
        this.currentLabel = { ...this.currentLabel };
        const key = event.key.toLowerCase();
        if (key == this.currentLabel.label.hotkey) return;
        const usedHotkeys = this.getUsedHotkey();
        if (key == 'ArrowRight' || key == 'ArrowLeft') {
            this.labelHotkeyError = "Key " + key + " is used to navigate between records."
            return;
        } else if (usedHotkeys.includes(key)) {
            this.labelHotkeyError = "Key " + key + " is already in use."
            return;
        } else if ('123456789'.includes(key)) {
            this.labelHotkeyError = "Key " + key + " is used to switch between users."
            return;
        } else if (!this.isValidKey(key)) {
            this.labelHotkeyError = "Key " + key + " not in whitelist."
            return;
        }
        this.currentLabel.label.hotkey = this.labelHotkeyError ? "" : key;
        if (!this.labelHotkeyError) {
            this.projectApolloService
                .updateLabelHotkey(this.settings.project.id, this.currentLabel.label.id, key).pipe(first())
                .subscribe();
        }

    }

    public isLabelNameUnique(taskId: string, name: string): boolean {
        if (name == '') return true;
        const trimmedName = name.trim();
        for (let label of this.labelMap.get(taskId)) {
            if (label['name'] == trimmedName) return false;
        }

        return true;
    }

    public removeLabel(projectId: string, taskId: string, labelId: string, labelColor: string) {
        let colorsInTask = this.labelingTaskColors.get(taskId);

        const index = colorsInTask.indexOf(labelColor);
        if (index > -1) {
            colorsInTask.splice(index, 1); // 2nd parameter means remove one item only
        }
        this.labelingTaskColors.set(taskId, colorsInTask);

        this.projectApolloService
            .deleteLabel(projectId, labelId).pipe(first())
            .subscribe();
    }

    public prepareSourceCode(sourceCode: string, function_name: string): string {
        return sourceCode.replace(
            'def lf(record):',
            'def ' + function_name + '(record):'
        );
    }


    private isValidKey(key: string): boolean {
        return LabelHelper.ALLOWED_KEYS.includes(key.toLowerCase());
    }


    private getUsedHotkey(): string[] {
        let usedHotkeys = [];
        this.labelMap.forEach((value, key) => {
            value.forEach((v: any) => {
                if (v.hotkey) usedHotkeys.push(v.hotkey);
            })
        })
        return usedHotkeys
    }

    private static getBackgroundColor(color: string): string {
        return `bg-${color}-100`
    }

    private static getTextColor(color: string): string {
        return `text-${color}-700`
    }

    private static getBorderColor(color: string): string {
        return `border-${color}-400`
    }

    private static getHoverColor(color: string): string {
        return `hover:bg-${color}-200`
    }
}

export type LabelColors = {
    name: string,
    backgroundColor: string,
    textColor: string,
    borderColor: string,
    hoverColor: string
}

type LabelModals = {
    changeColor: boolean,
    changeName: boolean,
}
type CurrentLabel = {
    label: any,
    taskId: string,
}

type RenameLabelData = {
    checkResults: any,
    newLabelName: string,
    canCheck: boolean
}