export interface ProjectStatistics {
    id: string;
    numDataScaleUploaded: number;
    numDataScaleManual: number;
    numDataScaleProgrammatical: number;
    numDataTestManual?: number;
    numDataTestUploaded?: number;
}
