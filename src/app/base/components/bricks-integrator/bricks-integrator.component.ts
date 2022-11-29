
import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { timer } from 'rxjs';
import { first } from 'rxjs/operators';
import { findProjectIdFromRoute } from 'src/app/util/helper-functions';
import { ProjectApolloService } from '../../services/project/project-apollo.service';
import { BricksCodeParser } from './helper/code-parser';
import { BricksDataRequestor } from './helper/data-requestor';
import { BricksAPIData, BricksIntegratorConfig, BricksVariable, BricksVariableType, getEmptyBricksIntegratorConfig, IntegratorPage } from './helper/type-helper';

@Component({
  selector: 'kern-bricks-integrator',
  templateUrl: './bricks-integrator.component.html',
  styleUrls: ['./bricks-integrator.component.scss']
})
export class BricksIntegratorComponent implements OnInit, OnDestroy {
  static httpBaseLink: string = "https://cms.bricks.kern.ai/api/modules/";
  static httpBaseLinkExample: string = "https://api.bricks.kern.ai/"

  static httpBaseLinkFilter: string = "https://cms.bricks.kern.ai/api/modules" //?filters[moduleType][$eq]=" // will be changed after search api is published

  get IntegratorPageType(): typeof IntegratorPage {
    return IntegratorPage;
  }

  //for search
  @Input() moduleTypeFilter: string; //generator, classifier or extractor
  @Input() executionTypeFilter: string; //activeLearner, pythonFunction or premium 

  //for values
  @Input() labelingTaskId: string;
  @Output() preparedCode = new EventEmitter<string | any>();

  @ViewChild("searchInput") searchInput: ElementRef;

  config: BricksIntegratorConfig;
  codeParser: BricksCodeParser;
  dataRequestor: BricksDataRequestor;


  //to be deleted
  private debugNoSearchRequery: boolean = true;

  constructor(private http: HttpClient, private projectApolloService: ProjectApolloService,
    private activatedRoute: ActivatedRoute,) {
  }
  ngOnInit(): void {
    this.initConfig();
    this.codeParser = new BricksCodeParser(this);
    const projectId = findProjectIdFromRoute(this.activatedRoute)
    this.dataRequestor = new BricksDataRequestor(this.projectApolloService, projectId);
  }
  ngOnDestroy(): void {
    this.dataRequestor.unsubscribeFromWebsocket();
  }

  openBricksIntegrator() {
    this.config.modalOpen = true;
    this.checkCanAccept();
    this.requestSearch();
    this.searchInput.nativeElement.value = "";
  }

  initConfig() {
    this.config = getEmptyBricksIntegratorConfig();
  }


  requestSearchDebounce(value: string) {
    //local search without requery
    const searchFor = value.toLowerCase();
    this.config.search.results.forEach(e =>
      e.visible = e.id.toString().startsWith(searchFor) ||
      e.attributes.name.toLowerCase().includes(searchFor) ||
      e.attributes.description.toLowerCase().includes(searchFor));
    this.config.search.nothingMatches = !this.config.search.results.find(e => e.visible)

    if (this.debugNoSearchRequery) return;
    //query data from endpoint for more sophisticated results
    if (this.config.search.debounce) this.config.search.debounce.unsubscribe();
    this.config.search.debounce = timer(500).subscribe(() => { this.requestSearch(searchFor); this.config.search.debounce = null; });

  }

  requestSearch(value: string = "") {
    this.config.search.requesting = true;
    this.config.search.searchValue = value;
    this.config.search.lastRequestUrl = this.buildSearchUrl();
    this.http.get(this.config.search.lastRequestUrl).pipe(first()).subscribe((c: any) => {
      this.config.search.requesting = false;
      this.config.search.results = c.data;
      this.config.search.results.forEach(e => e.visible = true);
      this.config.search.nothingMatches = this.config.search.results.length == 0;

    });
  }

  private buildSearchUrl(): string {
    let url = BricksIntegratorComponent.httpBaseLinkFilter;
    if (this.moduleTypeFilter) url += "?filters[moduleType][$eq]=" + this.moduleTypeFilter;
    if (this.executionTypeFilter) url += "&filters[executionType][$eq]=" + this.executionTypeFilter;
    return url;
  }

  selectSearchResult(id: number) {
    this.config.api.moduleId = id;
    this.optionClicked("ACCEPT");
  }

  optionClicked(button: string) {
    if (button == "CLOSE") this.config.modalOpen = false;
    else {
      switch (this.config.page) {
        case IntegratorPage.SEARCH:
          this.config.page = IntegratorPage.OVERVIEW;
          this.requestDataFromApi();
          break;
        case IntegratorPage.OVERVIEW:
        case IntegratorPage.INPUT_EXAMPLE:
          // jump to integration
          this.config.page = IntegratorPage.INTEGRATION;
          break;
        case IntegratorPage.INTEGRATION:
          //transfer code to editor
          this.finishUpIntegration();
          break;
      }

      this.checkCanAccept();
    }
  }

  private requestDataFromApi() {
    if (!this.config.api.moduleId) {
      console.log("no module id -> shouldn't happen");
      return;
    }
    this.config.api.requestUrl = BricksIntegratorComponent.httpBaseLink + this.config.api.moduleId;
    this.config.api.requesting = true;
    this.http.get(this.config.api.requestUrl).pipe(first()).subscribe((c: BricksAPIData) => {
      this.config.api.data = c;
      // this.config.api.data.data.attributes.sourceCode = DUMMY_CODE;
      this.config.api.requesting = false;
      this.config.example.requestData = this.config.api.data.data.attributes.inputExample;
      this.codeParser.prepareCode();
      this.checkCanAccept();
    });
  }

  requestExample() {
    if (!this.config.example.requestData || this.config.example.requestData.trim().length == 0) {
      console.log("no data -> shouldn't happen");
      return;
    }
    this.config.example.requesting = true;
    this.config.example.requestUrl = BricksIntegratorComponent.httpBaseLinkExample;
    this.config.example.requestUrl += this.config.api.data.data.attributes.moduleType + "s/" + this.config.api.data.data.attributes.endpoint;
    const headers = { "Content-Type": "application/json" };
    this.http.post(this.config.example.requestUrl, this.config.example.requestData, { headers }).pipe(first()).subscribe({
      next: data => {
        this.config.example.returnData = JSON.stringify(data, null, 2);
        this.config.example.requesting = false;
      },
      error: error => {
        this.config.example.returnData = error;
        this.config.example.requesting = false;
      }
    });
  }

  private finishUpIntegration() {
    if (this.config.codeFullyPrepared) {
      this.config.modalOpen = false;
      if (this.preparedCode.observers.length > 0) this.preparedCode.emit(this.config.preparedCode);
    } else {
      console.log("code not fully prepared")
    }
  }

  private checkCanAccept() {
    switch (this.config.page) {
      case IntegratorPage.SEARCH:
        this.config.canAccept = this.config.api.moduleId != null;
        break;
      case IntegratorPage.OVERVIEW:
      case IntegratorPage.INPUT_EXAMPLE:
        this.config.canAccept = !!this.config.api.data;
        break;
      case IntegratorPage.INTEGRATION:
        this.config.canAccept = this.config.codeFullyPrepared;
        break;
    }
  }


  copyToClipboard(textToCopy: string) {
    navigator.clipboard.writeText(textToCopy);
    this.config.copied = true;
    timer(1000).subscribe(() => this.config.copied = false);
  }

  genericDebounceTimer;
  debounceSetGeneric(variable: BricksVariable, index: number, el: HTMLInputElement) {
    if (this.genericDebounceTimer) this.genericDebounceTimer.unsubscribe();
    this.genericDebounceTimer = timer(500).subscribe(() => { this.setVariableValue(variable, index, el); this.genericDebounceTimer = null; });
  }
  setVariableValue(variable: BricksVariable, index: number, el: HTMLInputElement) {
    const elId = el.id
    variable.values[index] = el.value;
    this.codeParser.replaceVariables();
    //timeout since dom tree is updated so el != el after replaceVariables
    timer(50).subscribe(() => {
      const el = document.getElementById(elId as string) as HTMLInputElement;
      el.focus();
    });


  }

  setActiveNegateColorAndValue(variable: BricksVariable, index: number) {
    if (variable.type != BricksVariableType.GENERIC_BOOLEAN) return;
    if (variable.values[index] == null) {
      variable.values[index] = "True";
      variable.options.colors[index] = "#2563eb";
    } else if (variable.values[index] == "True") {
      variable.values[index] = "False";
      variable.options.colors[index] = "#ef4444";
    } else {
      variable.values[index] = null;
      variable.options.colors[index] = null;
    }
    this.codeParser.replaceVariables();
  }

  removeValueEntry(variable: BricksVariable, index: number) {
    variable.values.splice(index, 1);
    if (variable.type == BricksVariableType.GENERIC_BOOLEAN) {
      variable.options.colors.splice(index, 1);
    }
    this.codeParser.replaceVariables();
  }

}
/*
YOUR_LABEL:str = None 
YOUR_LABEL_2:List[str] = None 
YOUR_EMBEDDING:str = None 
YOUR_EMBEDDING_2:List[str] = None 
YOUR_MIN_CONFIDENCE:float = 0.8 
YOUR_GEN_FLOAT:float = 0
YOUR_GEN_FLOAT_2:list[float] = 0
YOUR_GEN_STR:str = "hello"
YOUR_GEN_STR_2:list[str] = "hello"
YOUR_GEN_INT:int = 0
YOUR_GEN_INT_2:list[int] = 0
YOUR_GEN_BOOL:bool = True
YOUR_GEN_BOOL_2:list[bool] = True
*/

const DUMMY_CODE = `
from sklearn.ensemble import RandomForestClassifier
# you can find further models here: https://scikit-learn.org/stable/supervised_learning.html#supervised-learning

YOUR_GEN_STR:str = "hello"
YOUR_GEN_STR_2:list[str] = "hello"
YOUR_GEN_INT:int = 0
YOUR_GEN_INT_2:list[int] = 0

class MyRF(LearningClassifier):

    def __init__(self):
        self.model = RandomForestClassifier()

    @params_fit(
        embedding_name = "your-embedding", # pick this from the options above
        train_test_split = 0.5 # we currently have this fixed, but you'll soon be able to specify this individually!
    )
    def fit(self, embeddings, labels):
        self.model.fit(embeddings, labels)

    @params_inference(
        min_confidence = 0.8,
        label_names = None # you can specify a list to filter the predictions (e.g. ["label-a", "label-b"])
    )
    def predict_proba(self, embeddings):
        return self.model.predict_proba(embeddings)


`;