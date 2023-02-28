export type AdminMessage = {
    id: string;
    text: string;
    archiveDate: string;
    level: AdminMessageLevel;
    displayDate: string;
};

export enum AdminMessageLevel {
    INFO = 'info',
    WARNING = 'warning'
};

export const adminMessageLevels = [
    { value: AdminMessageLevel.INFO, label: 'Info', color: 'blue' },
    { value: AdminMessageLevel.WARNING, label: 'Warning', color: 'yellow' }
];