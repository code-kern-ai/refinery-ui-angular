

export type ModalButton = {
    useButton?: boolean;
    type?: ModalButtonType; //shouldn't be set by use
    buttonCaption?: string;
    disabled?: boolean;
    closeAfterClick?: boolean;
    emitFunction?: (type: ModalButtonType) => void;
    emitObject?: Object; //if not set the button will emit the function (so 'this' points to the button)
};
export enum ModalButtonType {
    CLOSE = "CLOSE",
    ACCEPT = "ACCEPT",
    ABORT = "ABORT",
    BACK = "BACK",
    EDIT = "EDIT"
}
export function modalButtonCaption(type: ModalButtonType): string {
    switch (type) {
        case ModalButtonType.CLOSE: return "Close";
        case ModalButtonType.ACCEPT: return "Accept";
        case ModalButtonType.ABORT: return "Abort";
        case ModalButtonType.BACK: return "Back";
        case ModalButtonType.EDIT: return "Edit";
    }
}