export class DemoError extends Error {
    errorQueryType: string;
    errorQueryText: string;
    constructor(type: string, queryText: string, msg?: string) {
        super(msg);
        Object.setPrototypeOf(this, DemoError.prototype);
        this.errorQueryType = type;
        this.errorQueryText = queryText;
    }

    errorMessage(): string {
        if (this.message) return this.message
        return "This function isn't part of the demo application";
    }
}