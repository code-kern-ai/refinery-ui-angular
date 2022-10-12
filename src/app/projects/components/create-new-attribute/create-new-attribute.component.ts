import { Component, ElementRef, OnDestroy, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
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
  stickyObserver: IntersectionObserver;
  currentAttributeQuery$: any;
  @ViewChildren('stickyHeader', { read: ElementRef }) stickyHeader: QueryList<ElementRef>;
  @ViewChildren('nameArea') nameArea: QueryList<ElementRef>;
  subscriptions$: Subscription[] = [];
  currentAttribute: any;
  nameOpen: boolean = false;
  attributeName: string;
  codeFormCtrl = new FormControl('');
  editorOptions = { theme: 'vs-light', language: 'python', readOnly: false };
  attributeLogs: any;
  testerRequestedSomething: boolean = false;
  canRunProject: boolean = false;
  sampleRecords: any;
  code: string = '';
  @ViewChild('calculateAttribite', { read: ElementRef }) calculateAttribite: ElementRef;
  @ViewChild('deleteAttribute', { read: ElementRef }) deleteAttribute: ElementRef;
  updatedThroughWebsocket: boolean = false;
  checkIfNewAttribute: string;
  attributesQuery$: any;
  attributes: any[];
  recordData: any;
  currentRecordId: string;
  currentRecordIdx: number = -1;
  checkIfAtLeastRunning: boolean = false;
  attributesUsableUploaded: any;
  tokenizationProgress: Number = 0;
  isDeleting: boolean = false;
  duplicateNameExists: boolean = false;
  runOn10HasError: boolean = false;

  constructor(
    private activatedRoute: ActivatedRoute,
    private projectApolloService: ProjectApolloService,
    private recordApolloService: RecordApolloService,
    private routeService: RouteService,
    private router: Router) { }

  ngOnInit(): void {
    this.routeService.updateActivatedRoute(this.activatedRoute);
    const projectId = this.activatedRoute.parent.snapshot.paramMap.get('projectId');
    const attributeId = this.activatedRoute.snapshot.paramMap.get('attributeId');
    this.checkIfNewAttribute = JSON.parse(localStorage.getItem("isNewAttribute"));
    const project$ = this.projectApolloService.getProjectById(projectId);

    let tasks$ = [];
    tasks$.push(this.prepareAttributes(projectId));
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
    CommentDataManager.registerCommentRequests(this, requests);
  }

  ngAfterViewInit() {
    this.nameArea.changes.subscribe(() => {
      this.setFocus(this.nameArea);
    });
    this.stickyHeader.changes.subscribe(() => {
      if (this.stickyHeader.length) {
        this.prepareStickyObserver(this.stickyHeader.first.nativeElement);
      } else {
        this.stickyObserver = null;
      }
    });
  }

  ngOnDestroy() {
    this.subscriptions$.forEach((subscription) => subscription.unsubscribe());
    for (const e of this.stickyHeader) {
      this.stickyObserver.unobserve(e.nativeElement);
    }
    NotificationService.unsubscribeFromNotification(this, this.project.id);
    CommentDataManager.unregisterAllCommentRequests(this);
  }

  getWhiteListNotificationService(): string[] {
    let toReturn = ['attributes_updated', 'calculate_attribute', 'tokenization',];
    return toReturn;
  }

  setFocus(focusArea) {
    if (focusArea.length > 0) {
      focusArea.first.nativeElement.focus();
    }
  }

  prepareStickyObserver(element: HTMLElement) {
    if (this.stickyObserver) return;
    const toObserve = element;
    this.stickyObserver = new IntersectionObserver(
      ([e]) => {
        if (this.intersectionTimeout) return;
        this.isHeaderNormal = e.isIntersecting;
        if (this.isHeaderNormal) {
          var el = document.getElementById("pageOutlet");
          el.scrollTop = 0;
        }
        this.intersectionTimeout = true;
        timer(500).subscribe(() => this.intersectionTimeout = false);
      },
      { threshold: [1] },

    );
    this.stickyObserver.observe(toObserve)

  }

  prepareCurrentAttribute(projectId: string, attributeId: string) {
    [this.currentAttributeQuery$, this.attribute$] = this.projectApolloService.getAttributeByAttributeId(projectId, attributeId);
    this.subscriptions$.push(this.attribute$.subscribe((attribute) => {
      this.currentAttribute = attribute;
      this.attributeName = this.currentAttribute?.name;
      this.code = this.currentAttribute?.sourceCode;
      if (this.currentAttribute?.sourceCode == null) {
        this.code = AttributeCodeLookup.getAttributeCalculationTemplate(AttributeCalculationExamples.AC_EMPTY_TEMPLATE).code;
      } else {
        this.code = this.code.replace(
          'def ac(record):',
          'def ' + this.currentAttribute.name + '(record):'
        );
      }

      this.attributeLogs = attribute?.logs;
      this.canRunProject = this.currentAttribute?.sourceCode !== '';
      if (this.currentAttribute?.state == 'FAILED') {
        this.editorOptions = { ...this.editorOptions, readOnly: false };
      }
      if (this.currentAttribute?.state == 'RUNNING' || this.currentAttribute?.state == 'USABLE') {
        this.editorOptions = { ...this.editorOptions, readOnly: true };
      }
      this.checkIfAtLeastRunning = this.checkIfSomethingRunning();
      timer(250).subscribe(() => this.updatedThroughWebsocket = false);
    }));
  }

  checkIfSomethingRunning(): boolean {
    if (!this.attributes) return true;
    if (!this.currentAttribute) return true;
    const runningAtt = this.attributes?.find(att => att?.state == 'RUNNING');
    if (runningAtt != undefined) return true;
    return false;
  }

  openName(open: boolean, projectId) {
    this.nameOpen = open;
    this.duplicateNameExists = false;
    if (!open && this.attributeName != this.currentAttribute.name) {
      const findDuplicate = this.attributes.find(att => att.name == this.attributeName && att.id != this.currentAttribute.id);
      this.duplicateNameExists = findDuplicate != undefined ? true : false;
      if (this.duplicateNameExists) {
        this.attributeName = this.currentAttribute.name;
        return;
      };

      var regMatch: any = this.getPythonFunctionRegExMatch(this.code);
      if (!regMatch) return;
      this.code = this.code.replace(
        regMatch[0],
        'def ' + this.attributeName + '(record)'
      );
      this.saveAttribute(projectId);
    }
  }

  toPythonFunctionName(str: string) {
    return str.replace(/\s+/g, '_').replace(/[^\w]/gi, '').trim();
  }

  saveAttribute(projectId: string) {
    if (this.updatedThroughWebsocket) return;
    const getCodeToSave = this.getPythonFunctionToSave(this.code);
    this.projectApolloService
      .updateAttribute(projectId, this.currentAttribute.id, this.currentAttribute.dataType, this.currentAttribute.isPrimaryKey, this.attributeName, getCodeToSave)
      .pipe(first())
      .subscribe(() => this.duplicateNameExists = false);
  }

  changeAttributeName(event) {
    this.attributeName = this.toPythonFunctionName(event.target.value);
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
          const regMatch: any = this.getPythonFunctionRegExMatch(this.code);
          const findDuplicate = this.attributes.find(att => att.name == regMatch[2] && att.id != this.currentAttribute.id);
          this.duplicateNameExists = findDuplicate != undefined ? true : false;

          if (this.duplicateNameExists) {
            this.code = this.code.replace(
              'def ' + regMatch[2] + '(record):',
              'def ' + this.currentAttribute.name + '(record):'
            );
            return;
          }
          this.saveAttribute(projectId);
        }
      });
  }

  hasUnsavedChanges(): boolean {
    if (!this.currentAttribute) return false;
    if (this.updatedThroughWebsocket) return false;
    if (this.attributeName != this.currentAttribute.name) return true;
    if (this.currentAttribute.sourceCode == null) return true;
    if (
      this.code !=
      this.currentAttribute.sourceCode.replace(
        'def ac(record):',
        'def ' + this.currentAttribute.name + '(record):'
      )) return true;
    return false;
  }

  deleteUserAttribute(projectId, attributeId) {
    this.isDeleting = true;
    this.projectApolloService
      .deleteUserAttribute(projectId, attributeId)
      .pipe(first())
      .subscribe(() => {
        this.isDeleting = false;
        this.deleteAttribute.nativeElement.checked = false;
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
        this.calculateAttribite.nativeElement.checked = false;
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
        'Function code holds tab characters -- replaced with 4 spaces to prevent unwanted behaviour'
      );
      codeToSave = codeToSave.replace(/\t/g, '    ');
      this.code = this.code.replace(/\t/g, '    ');
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
      attributes.sort((a, b) => a.relativePosition - b.relativePosition);
      this.attributes = attributes;
      this.attributesUsableUploaded = this.attributes.filter((attribute) => attribute.state == 'UPLOADED' || attribute.state == 'USABLE' || attribute.state == 'AUTOMATICALLY_CREATED');
      this.checkIfAtLeastRunning = this.checkIfSomethingRunning();
    }));
    return attributes$.pipe(first());
  }

  getRecordByRecordId(recordId: string, index: number) {
    this.currentRecordId = recordId;
    this.currentRecordIdx = index;
    this.recordApolloService
      .getRecordByRecordId(this.project.id, recordId)
      .pipe(first())
      .subscribe((record) => {
        this.recordData = record.data;
      });
  }

  checkProjectTokenization(projectId: string) {
    this.projectApolloService.getProjectTokenization(projectId).pipe(first()).subscribe((v) => {
      this.tokenizationProgress = v?.progress;
    })
  }
}
