import { Component, ElementRef, OnDestroy, OnInit, QueryList, ViewChildren } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProjectApolloService } from 'src/app/base/services/project/project-apollo.service';
import { RouteService } from 'src/app/base/services/route.service';
import { first } from 'rxjs/operators';
import { forkJoin, Subscription, timer } from 'rxjs';
import { FormControl } from '@angular/forms';
import {
  debounceTime,
  startWith,
  distinctUntilChanged,
} from 'rxjs/operators';
import { NotificationService } from 'src/app/base/services/notification.service';
import { AttributeCalculationExamples, AttributeCodeLookup } from './new-attribute-code-lookup';
import { RecordApolloService } from 'src/app/base/services/record/record-apollo.service';
import { CommentDataManager, CommentType } from 'src/app/base/components/comment/comment-helper';
import { dataTypes } from 'src/app/util/data-types';
import { getColorForDataType, isStringTrue, toPythonFunctionName } from 'src/app/util/helper-functions';
import { KnowledgeBasesApolloService } from 'src/app/base/services/knowledge-bases/knowledge-bases-apollo.service';
import { AttributeCalculationModals, AttributeCalculationState, createDefaultAttributeCalculationModals } from './create-new-attribute-helper';
import { AttributeVisibility, attributeVisibilityStates, getTooltipVisibilityState } from './attributes-visibility-helper';
import { Attributes } from 'src/app/base/components/record-display/record-display.helper';

@Component({
  selector: 'kern-create-new-attribute',
  templateUrl: './create-new-attribute.component.html',
  styleUrls: ['./create-new-attribute.component.scss']
})
export class CreateNewAttributeComponent implements OnInit, OnDestroy {

  project: any;
  attribute$: any;
  isHeaderNormal: boolean = true;
  intersectionTimeout: boolean = false;
  currentAttributeQuery$: any;
  @ViewChildren('nameArea') nameArea: QueryList<ElementRef>;
  subscriptions$: Subscription[] = [];
  currentAttribute: any;
  nameOpen: boolean = false;
  attributeName: string;
  codeFormCtrl = new FormControl('');
  editorOptions = { theme: 'vs-light', language: 'python', readOnly: false };
  attributeLogs: any;
  testerRequestedSomething: boolean = false;
  sampleRecords: any;
  updatedThroughWebsocket: boolean = false;
  checkIfNewAttribute: boolean;
  attributesQuery$: any;
  attributes: any[];
  knowledgeBases: any;
  knowledgeBasesQuery$: any;
  checkIfAtLeastRunning: boolean = false;
  attributesUsableUploaded: any;
  tokenizationProgress: Number = 0;
  isDeleting: boolean = false;
  duplicateNameExists: boolean = false;
  runOn10HasError: boolean = false;
  dataTypesArray = dataTypes;
  attributeDataType: string;
  nextUpdateReplace: boolean = false;
  isInitial: boolean = null; //null as add state to differentiate between initial, not and unchecked
  attributeVisibilityStates = attributeVisibilityStates;
  attributeVisibilityVal: string;
  tooltipsArray: string[] = [];

  attributeCalculationModals: AttributeCalculationModals = createDefaultAttributeCalculationModals();
  attributeDetails: Attributes;
  isNameLoading: boolean = false;
  attributesNames: string[] = [];

  get AttributeCalculationState(): typeof AttributeCalculationState {
    return AttributeCalculationState;
  }

  constructor(
    private activatedRoute: ActivatedRoute,
    private projectApolloService: ProjectApolloService,
    private recordApolloService: RecordApolloService,
    private routeService: RouteService,
    private router: Router,
    private knowledgeBaseApollo: KnowledgeBasesApolloService,) { }

  ngOnInit(): void {
    this.routeService.updateActivatedRoute(this.activatedRoute);
    const projectId = this.activatedRoute.parent.snapshot.paramMap.get('projectId');
    const attributeId = this.activatedRoute.snapshot.paramMap.get('attributeId');
    this.checkIfNewAttribute = isStringTrue(localStorage.getItem("isNewAttribute"));
    const project$ = this.projectApolloService.getProjectById(projectId);

    let tasks$ = [];
    tasks$.push(this.prepareAttributes(projectId));
    tasks$.push(this.prepareKnowledgeRequest(projectId));
    tasks$.push(project$.pipe(first()));


    this.checkProjectTokenization(projectId);

    this.subscriptions$.push(project$.subscribe((project) => this.project = project));
    forkJoin(tasks$).subscribe(() => this.prepareCurrentAttribute(projectId, attributeId));

    NotificationService.subscribeToNotification(this, {
      projectId: projectId,
      whitelist: this.getWhiteListNotificationService(),
      func: this.handleWebsocketNotification
    });
    this.setUpCommentRequests(projectId);
  }

  private setUpCommentRequests(projectId: string) {
    const requests = [];
    requests.push({ commentType: CommentType.ATTRIBUTE, projectId: projectId });
    requests.push({ commentType: CommentType.LABELING_TASK, projectId: projectId });
    requests.push({ commentType: CommentType.KNOWLEDGE_BASE, projectId: projectId })
    CommentDataManager.registerCommentRequests(this, requests);
  }

  ngAfterViewInit() {
    this.nameArea.changes.subscribe(() => {
      this.setFocus(this.nameArea);
    });
  }

  ngOnDestroy() {
    this.subscriptions$.forEach((subscription) => subscription.unsubscribe());
    NotificationService.unsubscribeFromNotification(this, this.project.id);
    CommentDataManager.unregisterAllCommentRequests(this);
  }
  openBricksIntegrator() {
    document.getElementById('bricks-integrator-open-button').click();
  }

  getWhiteListNotificationService(): string[] {
    let toReturn = ['attributes_updated', 'calculate_attribute', 'tokenization',];
    toReturn.push(...['knowledge_base_updated', 'knowledge_base_deleted', 'knowledge_base_created']);
    return toReturn;
  }

  setFocus(focusArea) {
    if (focusArea.length > 0) {
      focusArea.first.nativeElement.focus();
    }
  }

  prepareCurrentAttribute(projectId: string, attributeId: string) {
    [this.currentAttributeQuery$, this.attribute$] = this.projectApolloService.getAttributeByAttributeId(projectId, attributeId);
    this.subscriptions$.push(this.attribute$.subscribe((attribute) => {
      this.currentAttribute = attribute;
      this.attributeName = this.currentAttribute?.name;
      this.attributeDataType = this.dataTypesArray.find((type) => type.value === this.currentAttribute?.dataType).name;
      this.attributeVisibilityVal = this.attributeVisibilityStates.find((type) => type.value === this.currentAttribute?.visibility).name;
      if (this.currentAttribute?.sourceCode == null) {
        this.codeFormCtrl.setValue(AttributeCodeLookup.getAttributeCalculationTemplate(AttributeCalculationExamples.AC_EMPTY_TEMPLATE, this.currentAttribute.dataType).code);
      } else {
        if (!this.codeFormCtrl.value || this.codeFormCtrl.value.includes("def ac(record") || this.nextUpdateReplace) {
          this.codeFormCtrl.setValue(this.currentAttribute.sourceCode.replace(
            'def ac(record',
            'def ' + this.currentAttribute.name + '(record'
          ));
          if (this.nextUpdateReplace) this.nextUpdateReplace = false;

        }

        if (this.isInitial == null) this.isInitial = AttributeCodeLookup.isCodeStillTemplate(this.currentAttribute.sourceCode, this.currentAttribute.dataType);
      }

      this.attributeLogs = attribute?.logs;
      this.attributeCalculationModals.executeAttribute.canRunProject = this.currentAttribute?.sourceCode !== '';
      if (this.currentAttribute?.state == AttributeCalculationState.FAILED) {
        this.editorOptions = { ...this.editorOptions, readOnly: false };
      }
      if (this.currentAttribute?.state == AttributeCalculationState.RUNNING || this.currentAttribute?.state == AttributeCalculationState.USABLE) {
        this.editorOptions = { ...this.editorOptions, readOnly: true };
      }
      this.checkIfAtLeastRunning = this.checkIfSomethingRunning();

      this.tooltipsArray = [];
      this.attributeVisibilityStates.forEach((state) => {
        this.tooltipsArray.push(getTooltipVisibilityState(state.value));
      });
      timer(250).subscribe(() => this.updatedThroughWebsocket = false);
    }));
  }

  checkIfSomethingRunning(): boolean {
    if (!this.attributes) return true;
    if (!this.currentAttribute) return true;
    const runningAtt = this.attributes?.find(att => att?.state == AttributeCalculationState.RUNNING);
    if (runningAtt != undefined) return true;
    return false;
  }

  openName(open: boolean, projectId) {
    this.nameOpen = open;
    this.duplicateNameExists = false;
    if (!open && this.attributeName != this.currentAttribute.name) {
      if (this.attributeName.trim().length == 0) {
        this.attributeName = this.currentAttribute.name;
        return;
      }
      const findDuplicate = this.attributes.find(att => att.name == this.attributeName && att.id != this.currentAttribute.id);
      this.duplicateNameExists = findDuplicate != undefined ? true : false;
      if (this.duplicateNameExists) {
        this.attributeName = this.currentAttribute.name;
        return;
      };

      var regMatch: any = this.getPythonFunctionRegExMatch(this.codeFormCtrl.value);
      if (!regMatch) return;
      this.codeFormCtrl.setValue(this.codeFormCtrl.value.replace(
        regMatch[0],
        'def ' + this.attributeName + '(record)'
      ));
      this.saveAttribute(projectId);
    }
  }

  saveAttribute(projectId: string, updateCode: boolean = true) {
    if (this.updatedThroughWebsocket) return;
    const getCodeToSave = this.getPythonFunctionToSave(this.codeFormCtrl.value);
    this.nextUpdateReplace = updateCode;
    this.projectApolloService
      .updateAttribute(projectId, this.currentAttribute.id, this.currentAttribute.dataType, this.currentAttribute.isPrimaryKey, this.attributeName, getCodeToSave, this.currentAttribute.visibility)
      .pipe(first())
      .subscribe(() => {
        this.duplicateNameExists = false;
        this.isNameLoading = false;
      });
  }

  changeAttributeName(event) {
    this.attributeName = toPythonFunctionName(event.target.value);
    if (this.attributeName != event.target.value) {
      event.target.value = this.attributeName;
    }
    this.isHeaderNormal = true;
  }

  isNameOpen(): boolean {
    return this.nameOpen;
  }

  initEditor(editor, projectId) {
    this.codeFormCtrl.valueChanges
      .pipe(
        debounceTime(2000), //5 sec
        distinctUntilChanged(),
        startWith('')
      )
      .subscribe(() => {
        if (this.hasUnsavedChanges()) {
          const regMatch: any = this.getPythonFunctionRegExMatch(this.codeFormCtrl.value);
          const findDuplicate = this.attributes.find(att => att.name == regMatch[2] && att.id != this.currentAttribute.id);
          this.duplicateNameExists = findDuplicate != undefined ? true : false;

          if (this.duplicateNameExists) {
            this.codeFormCtrl.setValue(this.codeFormCtrl.value.replace(
              'def ' + regMatch[2] + '(record',
              'def ' + this.currentAttribute.name + '(record'
            ));
            this.isNameLoading = false;
            return;
          }
          this.saveAttribute(projectId, false);
        }
      });
  }

  hasUnsavedChanges(): boolean {
    if (!this.currentAttribute) return false;
    if (this.updatedThroughWebsocket) return false;
    if (this.attributeName != this.currentAttribute.name) return true;
    if (this.currentAttribute.sourceCode == null) return true;
    if (
      this.codeFormCtrl.value !=
      this.currentAttribute.sourceCode.replace(
        'def ac(record',
        'def ' + this.currentAttribute.name + '(record'
      )) return true;
    return false;
  }

  deleteUserAttribute() {
    this.isDeleting = true;
    this.projectApolloService
      .deleteUserAttribute(this.project.id, this.currentAttribute.id)
      .pipe(first())
      .subscribe(() => {
        this.isDeleting = false;
        this.attributeCalculationModals.deleteUserAttribute.open = false
        this.router.navigate(["../../settings"], { relativeTo: this.activatedRoute });
      });
  }

  calculateUserAttributeSampleRecords() {
    if (this.testerRequestedSomething) return;
    this.testerRequestedSomething = true;
    this.projectApolloService
      .calculateUserAttributeSampleRecords(this.project.id, this.currentAttribute.id).pipe(first()).subscribe((sampleRecords) => {
        this.sampleRecords = sampleRecords;
        this.testerRequestedSomething = false;
        this.runOn10HasError = this.sampleRecords.calculatedAttributes.length > 0 ? false : true;
        this.currentAttributeQuery$.refetch();
      }, (error) => {
        this.testerRequestedSomething = false;
        this.currentAttributeQuery$.refetch();
      });
  }

  calculateUserAttributeAllRecords() {
    this.editorOptions = { ...this.editorOptions, readOnly: true };
    this.projectApolloService
      .calculateUserAttributeAllRecords(this.project.id, this.currentAttribute.id)
      .pipe(first())
      .subscribe(() => {
        this.attributeCalculationModals.executeAttribute.open = false;
        this.duplicateNameExists = false;
      });
  }

  handleWebsocketNotification(msgParts) {
    if (msgParts[1] == 'attributes_updated') {
      this.updatedThroughWebsocket = true;
      this.currentAttributeQuery$.refetch();
    } else if (msgParts[1] == 'calculate_attribute') {
      this.attributesQuery$.refetch();
      this.currentAttributeQuery$.refetch();
    } else if (['knowledge_base_updated', 'knowledge_base_deleted', 'knowledge_base_created'].includes(msgParts[1])) {
      if (this.knowledgeBasesQuery$) this.knowledgeBasesQuery$.refetch();
    } else if (msgParts[1] == 'tokenization' && msgParts[2] == 'docbin') {
      if (msgParts[3] == 'progress') {
        this.tokenizationProgress = Number(msgParts[4]);
      } else if (msgParts[3] == 'state') {
        if (msgParts[4] == 'IN_PROGRESS') this.tokenizationProgress = 0;
        else if (msgParts[4] == 'FINISHED') {
          timer(5000).subscribe(() => this.checkProjectTokenization(this.project.id));
        }
      }

    }
  }

  copyClicked: Number = -1;
  copyToClipboard(textToCopy, i = -1) {
    navigator.clipboard.writeText(textToCopy);
    if (i != -1) {
      this.copyClicked = i;
      timer(1000).pipe(first()).subscribe(() => {
        this.copyClicked = -1;
      })
    }
  }

  getPythonFunctionToSave(codeToSave: string): string {
    if (codeToSave.includes('\t')) {
      console.log(
        'Function code holds tab characters -- replaced with 4 spaces to prevent unwanted behavior'
      );
      codeToSave = codeToSave.replace(/\t/g, '    ');
      this.codeFormCtrl.setValue(this.codeFormCtrl.value.replace(/\t/g, '    '));
    }
    var regMatch: any = this.getPythonFunctionRegExMatch(codeToSave);
    if (!regMatch) return codeToSave;

    if (!this.checkIfNewAttribute || this.checkIfNewAttribute == null) {
      this.attributeName = regMatch[2];
    } else {
      localStorage.removeItem("isNewAttribute");
      this.checkIfNewAttribute = null;
    }

    return codeToSave.replace(regMatch[0], 'def ac(record)');
  }

  getPythonFunctionRegExMatch(codeToCheck: string): any {
    return /(def)\s(\w+)\([a-zA-Z0-9_:\[\]=, ]*\)/.exec(codeToCheck);
  }

  prepareAttributes(projectId: string) {
    let attributes$;
    [this.attributesQuery$, attributes$] = this.projectApolloService.getAttributesByProjectId(projectId, ['ALL']);
    this.subscriptions$.push(attributes$.subscribe((attributes) => {
      const attributesAll = attributes;
      attributes = attributes.filter((a) => a.visibility != AttributeVisibility.HIDE);
      attributes.sort((a, b) => a.relativePosition - b.relativePosition);
      this.attributes = attributes;
      this.attributesNames = attributes.map((attribute) => attribute.name);
      this.attributesUsableUploaded = attributesAll.filter((attribute) => attribute.state == AttributeCalculationState.UPLOADED || attribute.state == AttributeCalculationState.USABLE || attribute.state == AttributeCalculationState.AUTOMATICALLY_CREATED);
      this.attributesUsableUploaded.forEach(attribute => {
        attribute.color = getColorForDataType(attribute.dataType);
        attribute.dataTypeName = this.dataTypesArray.find((type) => type.value === attribute.dataType).name;
      });
      this.attributeDetails = Object.fromEntries(this.attributesUsableUploaded.map((attribute) => [attribute.id, attribute]));
      this.checkIfAtLeastRunning = this.checkIfSomethingRunning();
    }));
    return attributes$.pipe(first());
  }

  getRecordByRecordId(recordId: string, index: number) {
    this.attributeCalculationModals.attributeDetails.currentRecordIdx = index;
    this.recordApolloService
      .getRecordByRecordId(this.project.id, recordId)
      .pipe(first())
      .subscribe((record) => {
        this.attributeCalculationModals.attributeDetails.recordData = record;
      });
  }

  checkProjectTokenization(projectId: string) {
    this.projectApolloService.getProjectTokenization(projectId).pipe(first()).subscribe((v) => {
      this.tokenizationProgress = v?.progress;
    })
  }

  updateDataType(dataType: string) {
    this.currentAttribute.dataType = dataType;
    this.saveAttribute(this.project.id, false);
  }

  prepareKnowledgeRequest(projectId: string) {
    let vc;
    [this.knowledgeBasesQuery$, vc] = this.knowledgeBaseApollo.getKnowledgeBasesByProjectId(projectId);
    this.subscriptions$.push(vc.subscribe(bases => this.knowledgeBases = bases));
    return vc.pipe(first());
  }
  copyImportToClipboard(pythonVariable: string) {
    const statement = "from knowledge import " + pythonVariable;
    navigator.clipboard.writeText(statement);
  }

  updateVisibilityAttributes(value: string) {
    this.currentAttribute.visibility = value;
    this.saveAttribute(this.project.id, false);
  }

  onScrollEvent(event: Event) {
    if (!(event.target instanceof HTMLElement)) return;
    if ((event.target as HTMLElement).scrollTop > 0) {
      this.isHeaderNormal = false;
    } else {
      this.isHeaderNormal = true;
    }
  }
}
