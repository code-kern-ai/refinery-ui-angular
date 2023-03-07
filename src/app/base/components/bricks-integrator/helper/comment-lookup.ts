/**
 * Enum for interpreted comments.
 * @enum {string}
 */
export enum BricksVariableComment {
    /** @member {string} */
    /** only text attributes are provided for selection. */
    ATTRIBUTE_ONLY_TEXT = "only text",
    /** @member {string} */
    /** only text and category attributes are provided for selection. */
    ATTRIBUTE_ONLY_TEXT_LIKE = "only text like",
    /** @member {string} */
    /** only classification tasks are provided for selection. */
    LABELING_TASK_ONLY_CLASSIFICATION = "only classification",
    /** @member {string} */
    /** only extraction tasks are provided for selection. */
    LABELING_TASK_ONLY_EXTRACTION = "only extraction",
    /** @member {string} */
    /** all iso codes are provided (usually only most common ["de", "en", "es", "fr", "it", "ja", "ko", "pt", "ru", "zh"]) */
    LANGUAGE_ALL = "all",
    /** @member {string} */
    /** no need to fill this variable to be considered finished. */
    GLOBAL_OPTIONAL = "optional",
    /** @member {string} */
    /** does this brick need some labels */
    TASK_REQUIRED_LABELS = "expect, task, label",
}

export function isCommentTrue(comment: string, commentLookup: BricksVariableComment): boolean {
    if (!comment) return false;
    if (commentLookup.includes(",")) {
        const commentLookupArray = commentLookup.split(",");
        for (let i = 0; i < commentLookupArray.length; i++) {
            if (!comment.includes(commentLookupArray[i].trim())) return false;
        }
        return true;
    } else return comment.includes(commentLookup);
}

