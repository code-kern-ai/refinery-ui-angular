
import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { timer } from 'rxjs';
import { first } from 'rxjs/operators';
import { findProjectIdFromRoute, isStringTrue } from 'src/app/util/helper-functions';
import { KnowledgeBasesApolloService } from '../../services/knowledge-bases/knowledge-bases-apollo.service';
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

  static httpBaseLinkFilter: string = "https://cms.bricks.kern.ai/api/modules" // old version via Strapi


  get IntegratorPageType(): typeof IntegratorPage {
    return IntegratorPage;
  }

  @Input() forIde: string | boolean = false;

  //for search
  @Input() moduleTypeFilter: string; //generator, classifier or extractor
  @Input() executionTypeFilter: string; //activeLearner, pythonFunction or premium 
  //for values
  @Input() labelingTaskId: string;
  @Input() nameLookups: string[];
  @Output() preparedCode = new EventEmitter<string | any>();
  @Output() newTaskId = new EventEmitter<string>();

  @ViewChild("searchInput") searchInput: ElementRef;

  config: BricksIntegratorConfig;
  codeParser: BricksCodeParser;
  dataRequestor: BricksDataRequestor;
  functionType: string;

  constructor(private http: HttpClient, private projectApolloService: ProjectApolloService, private knowledgeBaseApollo: KnowledgeBasesApolloService,
    private activatedRoute: ActivatedRoute, private router: Router) {
  }

  ngOnInit(): void {
    if (typeof this.forIde == 'string') this.forIde = isStringTrue(this.forIde);
    this.initConfig();
    this.codeParser = new BricksCodeParser(this);
    const projectId = findProjectIdFromRoute(this.activatedRoute)
    this.dataRequestor = new BricksDataRequestor(this.projectApolloService, this.knowledgeBaseApollo, projectId, this);
    this.functionType = this.router.url.indexOf("attributes") > -1 ? "Attribute" : this.router.url.indexOf("heuristics") > -1 ? "Heuristic" : "Function";
  }
  ngOnDestroy(): void {
    this.dataRequestor.unsubscribeFromWebsocket();
  }

  openBricksIntegrator() {
    this.config.modalOpen = true;
    this.checkCanAccept();
    this.requestSearch();
    this.searchInput.nativeElement.value = "";
    this.searchInput.nativeElement.focus();
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

    //once real search is enabled remove return
    return;
    this.config.search.requesting = true;
    if (this.config.search.debounce) this.config.search.debounce.unsubscribe();
    this.config.search.debounce = timer(500).subscribe(() => { this.requestSearch(searchFor); this.config.search.debounce = null; });

  }

  private buildSearchUrl(): string {
    let url = BricksIntegratorComponent.httpBaseLinkFilter;
    let filter = "?pagination[pageSize]=99999";
    filter += this.extendUrl(this.moduleTypeFilter, "moduleType");
    filter += this.extendUrl(this.executionTypeFilter, "executionType");
    return url + filter;
  }

  private extendUrl(value: string, attribute: string): string {
    if (!value) return "";
    let filter = "";
    const splitVal: string[] = value.split(',');
    for (let i = 0; i < splitVal.length; i++) {
      filter += "&filters[" + attribute + "][$eq]=" + splitVal[i].trim();
    }
    return filter;
  }

  requestSearch(value: string = "") {
    this.config.search.requesting = true;
    this.config.search.searchValue = value;
    this.config.search.lastRequestUrl = this.buildSearchUrl();
    if (this.config.search.currentRequest) this.config.search.currentRequest.unsubscribe();
    this.config.search.currentRequest = this.http.get(this.config.search.lastRequestUrl).pipe(first()).subscribe({
      next: (data: any) => {
        this.config.search.requesting = false;
        this.config.search.currentRequest = null;
        let finalData = data.data;
        if (this.executionTypeFilter) {
          finalData = finalData.filter(e => e.attributes.executionType == this.executionTypeFilter);
        }
        finalData = this.filterMinVersion(finalData);

        this.config.search.results = finalData;
        this.config.search.results.forEach(e => e.visible = true);
        this.config.search.nothingMatches = this.config.search.results.length == 0;
        this.searchInput.nativeElement.focus();
      },
      error: error => {
        console.log("error in search request", error);
        this.config.search.requesting = false;
        this.config.search.currentRequest = null;
      }
    });
  }

  private filterMinVersion(data: any[]): any[] {
    if (!data || data.length == 0) return data;
    const el = document.getElementById('refineryVersion') as HTMLElement;
    if (!el) {
      console.log("no refineryVersion element found");
      return data;
    }
    const currentVersion = el.textContent.trim().replace("v", "").split(".").map(e => parseInt(e));
    if (currentVersion.length != 3) {
      console.log("current version is not in correct format");
      return data;
    }
    return data.filter(e => this.refineryCanHandle(currentVersion, e.attributes.minRefineryVersion));

  }
  private refineryCanHandle(refineryVersion: number[], brickVersion: string): boolean {
    if (!brickVersion) return true;
    const brickVersionSplit = brickVersion.split(".").map(e => parseInt(e));
    if (brickVersionSplit.length != 3) return false;
    for (let i = 0; i < 3; i++) {
      if (brickVersionSplit[i] > refineryVersion[i]) return false;
    }
    return true;
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

  switchToPage(page: IntegratorPage) {
    if (page == IntegratorPage.SEARCH || (this.config.api.requesting || this.config.api.data)) {
      this.config.page = page;
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

      this.config.api.data.data.attributes.link = "https://bricks.kern.ai/" + c.data.attributes.moduleType + "s/" + c.data.id;
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

  checkCanAccept() {
    switch (this.config.page) {
      case IntegratorPage.SEARCH:
        this.config.canAccept = this.config.api.moduleId != null;
        break;
      case IntegratorPage.OVERVIEW:
      case IntegratorPage.INPUT_EXAMPLE:
        this.config.canAccept = !!this.config.api.data;
        break;
      case IntegratorPage.INTEGRATION:
        this.config.canAccept = this.config.codeFullyPrepared && !this.codeParser.nameTaken;
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

  createNewLabelingTask() {
    this.dataRequestor.createNewLabelingTask(this.config.api.data.data.attributes.name, this.codeParser.expected.expectedTaskLabels.map(x => x.label));
  }
  addMissingLabelsToTask() {
    if (!this.labelingTaskId) return;
    const missing = this.codeParser.expected.expectedTaskLabels.filter(x => !x.exists).map(x => x.label);
    this.dataRequestor.createMissingLabels(this.labelingTaskId, missing);
  }

  selectDifferentTask(taskId: string) {
    if (this.labelingTaskId == taskId) {
      if (this.codeParser) this.codeParser.prepareCode();
      return;
    }

    const currentTaskType = this.dataRequestor.getLabelingTaskAttribute(this.labelingTaskId, "taskType");
    const newTaskType = this.dataRequestor.getLabelingTaskAttribute(taskId, "taskType");
    this.labelingTaskId = taskId;
    if (currentTaskType != newTaskType) {
      this.moduleTypeFilter = newTaskType == 'MULTICLASS_CLASSIFICATION' ? 'classifier' : 'extractor'
      this.config.api.data = null;
      this.config.page = IntegratorPage.SEARCH;
      this.requestSearch();
      this.searchInput.nativeElement.value = "";
      this.searchInput.nativeElement.focus();
    } else {
      if (this.codeParser) this.codeParser.prepareCode();
    }


    if (this.newTaskId.observers.length > 0) this.newTaskId.emit(taskId);
  }
}