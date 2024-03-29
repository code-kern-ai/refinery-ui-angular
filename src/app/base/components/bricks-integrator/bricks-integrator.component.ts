
import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { timer } from 'rxjs';
import { first } from 'rxjs/operators';
import { findProjectIdFromRoute } from 'src/app/util/helper-functions';
import { KnowledgeBasesApolloService } from '../../services/knowledge-bases/knowledge-bases-apollo.service';
import { ProjectApolloService } from '../../services/project/project-apollo.service';
import { BricksCodeParser } from './helper/code-parser';
import { BricksDataRequestor } from './helper/data-requestor';
import { BricksAPIData, BricksIntegratorConfig, BricksSearchData, BricksVariable, BricksVariableType, getEmptyBricksIntegratorConfig, IntegratorPage } from './helper/type-helper';
import { GROUPS_TO_REMOVE, extendDummyElements, getDummyNodeByIdForApi } from './helper/dummy-nodes';
import { caesarCipher } from 'src/app/util/cipher';
import { PASS_ME } from 'src/app/util/cipher';
import { copyToClipboard, removeArrayFromArray, isStringTrue, jsonCopy } from 'submodules/javascript-functions/general';
import { capitalizeFirst } from 'submodules/javascript-functions/case-types-parser';

@Component({
  selector: 'kern-bricks-integrator',
  templateUrl: './bricks-integrator.component.html',
  styleUrls: ['./bricks-integrator.component.scss']
})
export class BricksIntegratorComponent implements OnInit, OnDestroy {
  static httpBaseLink: string = "https://cms.bricks.kern.ai/api/modules/";
  static httpBaseLinkExample: string = "https://api.bricks.kern.ai/";

  //add port option for local development
  get HttpBaseLink(): string {
    if (this.config.querySourceSelectionRemote) return BricksIntegratorComponent.httpBaseLink;
    else return `http://localhost:${this.config.querySourceSelectionLocalStrapiPort}/api/modules/`
  }

  get HttpBaseLinkExample(): string {
    if (this.config.querySourceSelectionRemote) return BricksIntegratorComponent.httpBaseLinkExample;
    else return `http://localhost:${this.config.querySourceSelectionLocalBricksPort}/`
  }

  get HttpBaseLinkFilter(): string {
    // old version via Strapi -> change if search engine is live
    return this.HttpBaseLink;
  }


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
  @Input() functionType: string;
  @Output() preparedCode = new EventEmitter<string | any>();
  @Output() newTaskId = new EventEmitter<string>();

  @ViewChild("searchInput") searchInput: ElementRef;

  config: BricksIntegratorConfig;
  codeParser: BricksCodeParser;
  dataRequestor: BricksDataRequestor;

  constructor(private http: HttpClient, private projectApolloService: ProjectApolloService, private knowledgeBaseApollo: KnowledgeBasesApolloService,
    private activatedRoute: ActivatedRoute, private router: Router) {
  }

  ngOnInit(): void {
    if (typeof this.forIde == 'string') this.forIde = isStringTrue(this.forIde);
    this.initConfig();
    this.codeParser = new BricksCodeParser(this);
    const projectId = findProjectIdFromRoute(this.activatedRoute)
    this.dataRequestor = new BricksDataRequestor(this.projectApolloService, this.knowledgeBaseApollo, projectId, this);
  }
  ngOnDestroy(): void {
    this.dataRequestor.unsubscribeFromWebsocket();
  }

  openBricksIntegrator() {
    this.config.modalOpen = true;
    this.config.search.searchValue = "";
    this.checkCanAccept();
    this.requestSearch();
    this.searchInput.nativeElement.value = "";
    this.searchInput.nativeElement.focus();
  }

  initConfig() {
    this.config = getEmptyBricksIntegratorConfig();
    const localStrapiConfig = localStorage.getItem("localStrapiConfig");
    if (localStrapiConfig) {
      const unCiphered = JSON.parse(caesarCipher(localStrapiConfig, PASS_ME, true))
      this.config.querySourceSelectionLocalStrapiPort = unCiphered.strapiPort;
      this.config.querySourceSelectionLocalBricksPort = unCiphered.bricksPort;
      this.config.querySourceSelectionLocalStrapiToken = unCiphered.token;
    }
  }
  saveLocalConfig() {
    const localStrapiConfig = {
      querySourceSelectionRemote: this.config.querySourceSelectionRemote,
      strapiPort: this.config.querySourceSelectionLocalStrapiPort,
      bricksPort: this.config.querySourceSelectionLocalBricksPort,
      token: this.config.querySourceSelectionLocalStrapiToken
    };
    const ciphered = caesarCipher(JSON.stringify(localStrapiConfig), PASS_ME)
    localStorage.setItem("localStrapiConfig", ciphered);
  }


  requestSearchDebounce(value: string) {
    //local search without requery
    if (!value) value = "";
    const searchFor = value.toLowerCase();
    this.config.search.searchValue = searchFor;
    this.config.search.results.forEach(e =>
      e.searchVisible = e.id.toString().startsWith(searchFor) ||
      e.attributes.name.toLowerCase().includes(searchFor) ||
      e.attributes.description.toLowerCase().includes(searchFor));
    this.config.search.nothingMatches = !this.config.search.results.find(e => e.searchVisible && e.groupVisible)

    this.countGroupEntries();
    //once real search is enabled change BricksIntegratorComponent.httpBaseLinkFilter & remove return
    return;
    this.config.search.requesting = true;
    if (this.config.search.debounce) this.config.search.debounce.unsubscribe();
    this.config.search.debounce = timer(500).subscribe(() => { this.requestSearch(); this.config.search.debounce = null; });

  }

  private buildSearchUrl(): string {
    let filter = "?pagination[pageSize]=99999";
    filter += this.extendUrl(this.moduleTypeFilter, "moduleType");
    filter += this.extendUrl(this.executionTypeFilter, "executionType");
    return this.HttpBaseLink + filter;
  }

  private extendUrl(value: string, attribute: string): string {
    let filter = "";
    if (!value) return filter += "&filters[executionType][$ne]=activeLearner";
    const splitVal: string[] = value.split(',');
    for (let i = 0; i < splitVal.length; i++) {
      filter += "&filters[" + attribute + "][$eq]=" + splitVal[i].trim();
      filter += this.filterActiveLearnersFromGenerators(splitVal, i, filter);
    }
    return filter;
  }

  private filterActiveLearnersFromGenerators(splitVal: string[], index: number, filter: string) {
    // Remove active learners from generators (on ac page we have generators and classifiers but we want to exclude active learners there)
    if (splitVal[index].trim() == 'generator' && this.executionTypeFilter != "activeLearner") {
      filter += "&filters[executionType][$ne]=activeLearner";
    }
    return filter;
  }

  requestSearch() {
    this.config.search.requesting = true;
    this.config.search.lastRequestUrl = this.buildSearchUrl();
    if (this.config.search.currentRequest) this.config.search.currentRequest.unsubscribe();

    let options = undefined;

    if (!this.config.querySourceSelectionRemote) {
      options = {
        headers: {
          "Authorization": `Bearer ${this.config.querySourceSelectionLocalStrapiToken}`
        }
      };
      this.saveLocalConfig();
    }
    this.config.search.currentRequest = this.http.get(this.config.search.lastRequestUrl, options).pipe(first()).subscribe({
      next: (data: any) => {
        this.config.extendedIntegrator = data.data.some(e => e.attributes.partOfGroup); //new field in integrator

        this.config.search.requesting = false;
        this.config.search.currentRequest = null;
        let finalData;
        if (this.config.extendedIntegrator) {
          finalData = data.data.map(integratorData => {
            const integratorDataCopy = jsonCopy(integratorData);
            if (integratorData.attributes.partOfGroup) {
              integratorDataCopy.attributes.partOfGroup = JSON.parse(integratorDataCopy.attributes.partOfGroup);
              integratorDataCopy.attributes.partOfGroup = removeArrayFromArray(integratorDataCopy.attributes.partOfGroup, GROUPS_TO_REMOVE);
            }
            if (integratorData.attributes.availableFor) integratorDataCopy.attributes.availableFor = JSON.parse(integratorDataCopy.attributes.availableFor);
            if (integratorData.attributes.integratorInputs) integratorDataCopy.attributes.integratorInputs = JSON.parse(integratorDataCopy.attributes.integratorInputs);
            return integratorDataCopy;
          });
        } else finalData = data.data;
        if (this.executionTypeFilter) {
          const toFilter = this.executionTypeFilter.split(",");
          finalData = finalData.filter(e => toFilter.includes(e.attributes.executionType));
        }
        finalData = this.filterMinVersion(finalData);
        extendDummyElements(finalData, this.config.extendedIntegrator);
        finalData = this.filterForExtendedIntegrator(finalData);
        this.config.search.results = finalData;
        this.filterGroup();
        this.searchInput.nativeElement.focus();
      },
      error: error => {
        console.log("error in search request", error);
        this.config.search.requesting = false;
        this.config.search.currentRequest = null;
      }
    });
  }

  setGroupActive(key: string) {
    if (this.config.groupFilterOptions.filterValues[key].active) return;
    for (let k in this.config.groupFilterOptions.filterValues) {
      this.config.groupFilterOptions.filterValues[k].active = false;
    }
    this.config.groupFilterOptions.filterValues[key].active = true;
    this.filterGroup();
  }

  private filterGroup() {
    this.config.search.results.forEach(e => e.groupVisible = this.filterForGroup(e));
    this.requestSearchDebounce(this.config.search.searchValue);

  }
  private filterForGroup(e: BricksSearchData): boolean {
    if (!this.config.extendedIntegrator) return true;

    const gRef = this.config.groupFilterOptions;
    const activeGroups = [];
    Object.keys(gRef.filterValues).forEach((x) => {
      if (gRef.filterValues[x].active) activeGroups.push(x);
    });
    if (gRef.filterValues["all"].active) return true;
    if (!e.attributes.partOfGroup) return false;
    return activeGroups.every(group => e.attributes.partOfGroup.includes(group));

  }
  private countGroupEntries() {
    const data = this.config.groupFilterOptions.filterValues;
    for (const key in data) data[key].countInGroup = 0;

    for (let e of this.config.search.results) {
      if (!e.attributes.partOfGroup) continue;
      if (!e.searchVisible) continue;
      e.attributes.partOfGroup.forEach(group => data[group].countInGroup++);
      data["all"].countInGroup++
    }
    this.config.groupFilterOptions.filterValuesArray = []
    for (const key in data) if (data[key].countInGroup > 0 || data[key].active) this.config.groupFilterOptions.filterValuesArray.push(data[key]);
    this.config.groupFilterOptions.filterValuesArray.sort((a, b) => b.countInGroup - a.countInGroup || a.name.localeCompare(b.name));
  }

  private filterForExtendedIntegrator(data: any[]): any[] {
    this.addFilterPartOfGroup("all");
    for (let e of data) {
      if (!e.attributes.partOfGroup) continue;
      if (e.attributes.executionType && e.attributes.executionType != "activeLearner") e.attributes.partOfGroup.push(e.attributes.executionType);
      e.attributes.partOfGroup.forEach(group => this.addFilterPartOfGroup(group));
    }
    if (Object.keys(this.config.groupFilterOptions.filterValues).length < 2) return data;

    return data.filter(e => e.attributes.availableFor ? e.attributes.availableFor.includes("refinery") : true)

  }

  private addFilterPartOfGroup(key: string, forceNew: boolean = false) {
    if (this.config.groupFilterOptions.filterValues[key] && !forceNew) return;
    const name = this.getGroupName(key);

    this.config.groupFilterOptions.filterValues[key] = { key: key, name: name, active: key == "all", countInGroup: -1 }

  }

  private getGroupName(groupKey: string): string {
    switch (groupKey) {
      case "no_api_key": return "No API Key";
      default: return capitalizeFirst(groupKey);
    }
  }

  setCodeTesterCode(code: string) {
    this.config.api.data.data.attributes.sourceCode = code;
    this.checkCanAccept();
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
      if (refineryVersion[i] > brickVersionSplit[i]) return true;
      else if (refineryVersion[i] < brickVersionSplit[i]) return false;
      //else continue with next digit
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
          if (this.config.api.moduleId < 0) this.codeParser.prepareCode();
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
    if (this.config.api.moduleId < 0) {
      this.config.api.data = getDummyNodeByIdForApi(this.config.api.moduleId);
      return;
    }
    this.config.api.requestUrl = this.HttpBaseLink + this.config.api.moduleId;
    this.config.api.requesting = true;
    let options = undefined;
    if (!this.config.querySourceSelectionRemote) {
      options = {
        headers: {
          "Authorization": `Bearer ${this.config.querySourceSelectionLocalStrapiToken}`
        }
      };
    }

    this.http.get(this.config.api.requestUrl, options).pipe(first()).subscribe({
      next: (c: any) => {
        if (!c.data.attributes.integratorInputs) this.config.api.data = c;
        else {
          // Additional parsing for integrator inputs used in the overview section in the bricks integrator
          this.config.api.data = c;
          this.config.api.data.data.attributes.partOfGroup = JSON.parse(c.data.attributes.partOfGroup);
          this.config.api.data.data.attributes.partOfGroup = removeArrayFromArray(this.config.api.data.data.attributes.partOfGroup, GROUPS_TO_REMOVE);
          this.config.api.data.data.attributes.partOfGroupText = this.config.api.data.data.attributes.partOfGroup.map(x => this.getGroupName(x)).join(", ");
          this.config.api.data.data.attributes.availableFor = JSON.parse(c.data.attributes.availableFor);
          this.config.api.data.data.attributes.integratorInputs = JSON.parse(c.data.attributes.integratorInputs);
        }
        this.config.api.data.data.attributes.bricksLink = "https://bricks.kern.ai/" + c.data.attributes.moduleType + "s/" + c.data.id;
        this.config.api.data.data.attributes.issueLink = "https://github.com/code-kern-ai/bricks/issues/" + c.data.attributes.issueId;
        this.config.api.requesting = false;
        this.config.example.requestData = this.config.api.data.data.attributes.inputExample;
        this.codeParser.prepareCode();
        this.checkCanAccept();
      },
      error: error => {
        console.log("error in search request", error);
        this.config.api.requesting = false;
      }
    });
  }

  requestExample() {
    if (!this.config.example.requestData || this.config.example.requestData.trim().length == 0) {
      console.log("no data -> shouldn't happen");
      return;
    }
    this.config.example.requesting = true;
    this.config.example.requestUrl = this.HttpBaseLinkExample;
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
        if (this.config.api.moduleId == -1) this.config.canAccept = !!this.config.api.data.data.attributes.sourceCode;
        else this.config.canAccept = !!this.config.api.data;
        break;
      case IntegratorPage.INTEGRATION:
        this.config.canAccept = this.config.codeFullyPrepared && !this.codeParser.nameTaken && this.codeParser.functionName != "";
        break;
    }
  }


  copyToClipboard(textToCopy: string) {
    copyToClipboard(textToCopy);
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

  onInputFunctionName(event: Event) {
    if (!(event.target instanceof HTMLInputElement)) return;
    const start = event.target.selectionStart;
    let value = event.target.value;
    this.codeParser.checkFunctionNameAndSet(value)
    event.target.value = this.codeParser.functionName;
    event.target.selectionStart = start;
    event.target.selectionEnd = start;
  }
}