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

export type ActiveSearchParams = {
    id: number;
    searchText: string;
    searchTextReplaced: string;
    splittedText: string[];
    values: any;
};

export type Attribute = {
    [k: string]: any;
}