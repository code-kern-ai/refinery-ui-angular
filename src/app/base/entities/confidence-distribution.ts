export interface ConfidenceDistributionData {
  labelId: string;
  confidenceList: number[];
}

export class ConfidenceDistribution {
  labelId: string;
  confidenceList: number[];

  constructor() {}

  public static createConfidenceDistribution(
    data: ConfidenceDistributionData
  ): ConfidenceDistribution {
    const confidenceDistribution = new ConfidenceDistribution();
    confidenceDistribution.labelId = data.labelId;
    confidenceDistribution.confidenceList = data.confidenceList;

    return confidenceDistribution;
  }
}
