

export enum InformationSourceExamples {
    LF_EMPTY_CLASSIFICATION,
    LF_EMPTY_EXTRACTION,
    AL_EMPTY_CLASSIFICATION,
    AL_EMPTY_EXTRACTION
}

//maybe into backend?
export class InformationSourceCodeLookup {
    private static templateEnumArray = [];

    static getInformationSourceTemplate(l: InformationSourceExamples) {
        switch (l) {
            case InformationSourceExamples.LF_EMPTY_EXTRACTION:
                return {
                    name: "my_labeling_function", code: `def lf(record):
    # token start is included, end is excluded so e.g. 
    # for token in record["str_attribute"]:
    #    if token.is_digit:
    #        yield "your_label", token.i, token.i + 1
`}

            case InformationSourceExamples.LF_EMPTY_CLASSIFICATION:
                return {
                    name: "my_labeling_function", code: `def lf(record):
    # e.g.
    # if "some_value" in record["str_attribute"].text.lower():
    #     return "your_label"
`}
            case InformationSourceExamples.AL_EMPTY_CLASSIFICATION:
                return {
                    name: "MyClassifier", code: `from sklearn.linear_model import LogisticRegression
# you can find further models here: https://scikit-learn.org/stable/supervised_learning.html#supervised-learning

class ATLClassifier(LearningClassifier):

    def __init__(self):
        self.model = LogisticRegression()

    @params_fit(
        embedding_name = "@@EMBEDDING@@", # pick this from the options above
        train_test_split = 0.5 # we currently have this fixed, but you'll soon be able to specify this individually!
    )
    def fit(self, embeddings, labels):
        self.model.fit(embeddings, labels)

    @params_inference(
        min_confidence = 0.9,
        label_names = None # you can specify a list to filter the predictions (e.g. ["label-a", "label-b"])
    )
    def predict_proba(self, embeddings):
        return self.model.predict_proba(embeddings)
`}
            case InformationSourceExamples.AL_EMPTY_EXTRACTION:
                return {
                    name: "MyExtractor", code: `from sequencelearn.sequence_tagger import CRFTagger
# you can find further models here: https://github.com/code-kern-ai/sequence-learn

class ATLExtractor(LearningExtractor):

    def __init__(self):
        self.model = CRFTagger(
            num_epochs = 100, # Number of epochs to train the CRF tagger
            learning_rate = 0.001, # Factor to apply during backpropagation
            momentum = 0.9, # Factor to weigh previous iteration during training
            random_seed = None, # Random seed to use for reproducibility. If None, a random seed is chosen
            verbose = False, # set to True to see the training progress
        )

    @params_fit(
        embedding_name = "@@EMBEDDING@@", # pick this from the options above
        train_test_split = 0.5 # we currently have this fixed, but you'll soon be able to specify this individually!
    )
    def fit(self, embeddings, labels):
        self.model.fit(embeddings, labels)

    @params_inference(
        min_confidence = 0.9,
        label_names = None # you can specify a list to filter the predictions (e.g. ["label-a", "label-b"])
    )
    def predict_proba(self, embeddings):
        return self.model.predict_proba(embeddings)
`}

            default:
                return { name: "unknown example", code: "" }
        }
    }

    static isCodeStillTemplate(code: string): InformationSourceExamples {
        if (InformationSourceCodeLookup.templateEnumArray.length == 0) {
            for (let t of Object.values(InformationSourceExamples).filter(x => isNaN(Number(x)))) {
                InformationSourceCodeLookup.templateEnumArray.push({ example: InformationSourceExamples[t], value: InformationSourceCodeLookup.getInformationSourceTemplate(InformationSourceExamples[t]) })
            }
        }

        for (const e of InformationSourceCodeLookup.templateEnumArray) {
            if (e.value.code.trim() == code.trim()) return e.example;
        }

        return null;
    }


}