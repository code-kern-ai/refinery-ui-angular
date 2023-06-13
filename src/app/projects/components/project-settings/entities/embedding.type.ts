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
    name?: string;
};

export type EmbeddingPlatform = {
    platform: string;
    gdprCompliant: boolean;
    name: string;
}