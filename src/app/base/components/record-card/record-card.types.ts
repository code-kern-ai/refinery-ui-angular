export type DataBrowserRecord = {
    category: string;
    created_at: string;
    data: any;
    db_order: number;
    id: string;
    project_id: string;
    record_id: string;
    rla_aggregation: any;
    rla_data: any;
    wsHint: string;
};

export type AttributeSort = {
    key: string;
    name: string;
    order: number;
    type: string;
};

export type ExtendedRecord = {
    fullCount: number;
    queryLimit: number;
    queryOffset: number;
    recordList: DataBrowserRecord[];
    sessionId: string;
    sql: string;
};