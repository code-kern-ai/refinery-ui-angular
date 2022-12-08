
export type RegexMatch = {
    start: number,
    end: number
}

export type RegexDisplay = {
    text: string,
    isMatch: boolean
}

export type HighlightSearch = {
    searchFor?: string,
    matchCase?: boolean
    regex?: RegExp
}