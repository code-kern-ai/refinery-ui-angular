export type AdminMessage = {
    id: string;
    text: string;
    archiveDate: string;
    level: AdminMessageLevel;
    displayDate: string;
    textColor: string;
    backgroundColor: string;
    borderColor: string;
    createdAt: string;
    createdAtDisplay: string;
};

export enum AdminMessageLevel {
    INFO = 'info',
    WARNING = 'warning'
};

export const adminMessageLevels = {
    [AdminMessageLevel.INFO]: { label: 'Info', color: 'blue' },
    [AdminMessageLevel.WARNING]: { label: 'Warning', color: 'yellow' }
};