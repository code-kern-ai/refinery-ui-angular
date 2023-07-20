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
    platform?: string;
    model?: string;
    apiToken?: string;
    filterAttributes: string[];
};

export type EmbeddingPlatform = {
    platform: string;
    name: string;
    terms: string;
    splitTerms: string[];
    link: string;
}