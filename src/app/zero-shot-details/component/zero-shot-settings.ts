
export type ZeroShotSettings = {
    taskId?: string;
    targetConfig: string;
    attributeId: string;
    attributeSelectDisabled?: boolean;
    minConfidence: number;
    excludedLabels: string[];
    runIndividually: boolean;
};


export function parseZeroShotSettings(settingsJson: string): ZeroShotSettings {
    const tmp = JSON.parse(settingsJson);
    return {
        targetConfig: tmp.config,
        attributeId: tmp.attribute_id,
        minConfidence: tmp.min_confidence,
        excludedLabels: tmp.excluded_labels,
        runIndividually: tmp.run_individually
    }
}

export function parseToSettingsJson(settings: ZeroShotSettings): string {
    const tmp = {
        config: settings.targetConfig,
        attribute_id: settings.attributeId,
        min_confidence: settings.minConfidence,
        excluded_labels: settings.excludedLabels,
        run_individually: settings.runIndividually
    }
    return JSON.stringify(tmp);
}