export interface LabelDistributionData {
  labelId: string;
  labelName: string;
  ratioScaleManually: number;
  abosluteScaleManually: number;
  ratioScaleProgrammatically: number;
  absoluteScaleProgrammatically: number;
}

export class LabelDistribution {
  labelId: string;
  labelName: string;
  ratioScaleManually: number;
  absoluteScaleManually: number;
  ratioScaleProgrammatically: number;
  absoluteScaleProgrammatically: number;

  constructor() { }

  public static createLabelDistribution(
    data: LabelDistributionData
  ): LabelDistribution {
    const labelDistribution = new LabelDistribution();

    labelDistribution.labelId = data.labelId;
    labelDistribution.labelName = data.labelName;
    labelDistribution.ratioScaleManually = data.ratioScaleManually;
    labelDistribution.absoluteScaleManually = data.abosluteScaleManually;
    labelDistribution.ratioScaleProgrammatically = data.ratioScaleProgrammatically;
    labelDistribution.absoluteScaleProgrammatically = data.absoluteScaleProgrammatically;

    return labelDistribution;
  }
}
