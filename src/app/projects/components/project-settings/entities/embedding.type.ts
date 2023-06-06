export type Embedding = {
    id: string;
    applicability: string;
    configString: string;
    description: string;
    tokenizers: string[];
    hidden?: boolean;
    forceHidden?: boolean;
    state?: string;
    progress?: number;
};

export type EmbeddingPlatform = {
    platform: string;
    gdprCompliant: boolean;
    terms: string;
    name: string;
}