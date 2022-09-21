
//int based enough since not used outside of frontend
export enum DisplayGraphs {
    ALL,
    CONFUSION_MATRIX,
    INTER_ANNOTATOR,
    LABEL_DISTRIBUTION,
    CONFIDENCE_DISTRIBUTION,
}

export function displayGraphsTypeToString(source: DisplayGraphs) {
    switch (source) {
        case DisplayGraphs.ALL: return "All";
        case DisplayGraphs.CONFUSION_MATRIX: return "Confusion Matrix";
        case DisplayGraphs.INTER_ANNOTATOR: return "Inter Annotator";
        case DisplayGraphs.LABEL_DISTRIBUTION: return "Label Distribution";
        case DisplayGraphs.CONFIDENCE_DISTRIBUTION: return "Confidence Distribution";
        default: return "";
    }
}

export function getDisplayGraphValueArray(): [{ value: number, name: string }] {
    let toReturn = [];
    for (const key in Object.keys(DisplayGraphs)) {
        if (isNaN(Number(key))) continue;
        const name = displayGraphsTypeToString(Number(key));
        if (name) toReturn.push({ value: key, name: name })

    }
    return toReturn as [{ value: number, name: string }];
}



export type ProjectStats = {
    generalLoading: boolean;
    general: {};
    generalPercent: {};
    generalStats: {};
    interAnnotatorLoading: boolean;
    interAnnotator: string;
    interAnnotatorStat: number;
};

export function getEmptyProjectStats(): ProjectStats {
    return {
        generalLoading: false, general: {}, generalPercent: {
            "INFORMATION_SOURCE": "n/a",
            "WEAK_SUPERVISION": "n/a",
            "MANUAL": "n/a"
        }, generalStats: {}, interAnnotatorLoading: false, interAnnotator: "n/a", interAnnotatorStat: -1
    }
}
