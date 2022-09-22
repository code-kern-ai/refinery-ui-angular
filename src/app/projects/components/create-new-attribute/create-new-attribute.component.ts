import { Component, ElementRef, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProjectApolloService } from 'src/app/base/services/project/project-apollo.service';
import { RouteService } from 'src/app/base/services/route.service';
import { first } from 'rxjs/operators';
import { combineLatest, Subscription, timer } from 'rxjs';
import { FormControl } from '@angular/forms';
import {
  debounceTime,
  startWith,
  distinctUntilChanged,
} from 'rxjs/operators';
import { NotificationService } from 'src/app/base/services/notification.service';
import { AttributeCalculationExamples, AttributeCodeLookup } from './new-attribute-code-lookup';
import { RecordApolloService } from 'src/app/base/services/record/record-apollo.service';

@Component({
  selector: 'kern-create-new-attribute',
  templateUrl: './create-new-attribute.component.html',
  styleUrls: ['./create-new-attribute.component.scss']
})
export class CreateNewAttributeComponent implements OnInit {

  project: any;
  attribute$: any;
  isHeaderNormal: boolean = true;
  stickyObserver: IntersectionObserver;
  attributeQuery$: any;
  @ViewChildren('stickyHeader', { read: ElementRef }) stickyHeader: QueryList<ElementRef>;
  @ViewChildren('nameArea') nameArea: QueryList<ElementRef>;
  subscriptions$: Subscription[] = [];
  attribute: any;
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
  attributes: any;
  recordData: any;
  currentRecordId: string;
  currentRecordIdx: number = -1;
  checkIfAtLeastRunning: boolean = false;
  attributesUsableUploaded: any;
  tokenizationProgress: Number = 0;
  isDeleting: boolean = false;

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
    combineLatest(tasks$).subscribe(() => this.prepareAttribute(projectId,attributeId));

    NotificationService.subscribeToNotification(this, {
      projectId: projectId,
      whitelist: this.getWhiteListNotificationService(),
      func: this.handleWebsocketNotification
    });
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
  }

  getWhiteListNotificationService(): string[] {
    let toReturn = ['attributes_updated','calculate_attribute','tokenization',];
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
        this.isHeaderNormal = e.isIntersecting;
      },
      { threshold: [1] }
    );
    this.stickyObserver.observe(toObserve)
  }

  prepareAttribute(projectId: string, attributeId: string) {
    [this.attributeQuery$, this.attribute$] = this.projectApolloService.getAttributeByAttributeId(projectId, attributeId);
    this.subscriptions$.push(this.attribute$.subscribe((attribute) => {
      this.attribute = attribute;
      this.attributeName = this.attribute?.name;
      this.code = this.attribute?.sourceCode;
      if(this.attribute?.sourceCode == null) { 
        this.code = AttributeCodeLookup.getAttributeCalculationTemplate(AttributeCalculationExamples.AC_EMPTY_TEMPLATE).code;
      } else {
        this.code = this.code.replace(
          'def ac(record):',
          'def ' + this.attribute.name + '(record):'
        );
      }
      
      this.attributeLogs = attribute?.logs;
      this.canRunProject = this.attribute?.sourceCode !== '';
      if(this.attribute?.state == 'FAILED') {
        this.editorOptions = { ...this.editorOptions, readOnly: false };
      }
      if(this.attribute?.state == 'RUNNING' || this.attribute?.state == 'USABLE') {
        this.editorOptions = { ...this.editorOptions, readOnly: true };
      }
      const runningAtt = this.attributes?.find(att => att?.state == 'RUNNING');
      if(runningAtt != undefined) {
        this.checkIfAtLeastRunning = true;
      }
      timer(250).subscribe(() => this.updatedThroughWebsocket = false);
    }));
  }

  openName(open: boolean, projectId) {
    this.nameOpen = open;
    if (!open && this.attributeName != this.attribute.name) {
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
      .updateAttribute(projectId, this.attribute.id, this.attribute.dataType, this.attribute.isPrimaryKey, this.attributeName, getCodeToSave)
      .pipe(first())
      .subscribe();
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
          this.saveAttribute(projectId);
        }
      });
  }

  hasUnsavedChanges(): boolean {
    if (!this.attribute) return false;
    if (this.updatedThroughWebsocket) return false;
    if (this.attributeName != this.attribute.name) return true;
    if (this.attribute.sourceCode == null) return true;
    if (
      this.code !=
      this.attribute.sourceCode.replace(
        'def ac(record):',
        'def ' + this.attribute.name + '(record):'
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
      .calculateUserAttributeSampleRecords(this.project.id, this.attribute.id).pipe(first()).subscribe((sampleRecords) => {
        this.sampleRecords = sampleRecords;
        this.testerRequestedSomething = false;
        this.attributeQuery$.refetch();
      }, (error) => {
        this.testerRequestedSomething = false;
        this.attributeQuery$.refetch();
      });
  }

  calculateUserAttributeAllRecords() {
    this.editorOptions = { ...this.editorOptions, readOnly: true };
    this.projectApolloService
    .calculateUserAttributeAllRecords(this.project.id, this.attribute.id)
    .pipe(first())
    .subscribe(() => {
      this.calculateAttribite.nativeElement.checked = false;
    });
  }

  handleWebsocketNotification(msgParts) {
    if(msgParts[1]=='attributes_updated') {
      this.updatedThroughWebsocket = true;
      this.attributeQuery$.refetch();
    } else if(msgParts[1]=='calculate_attribute') {
      this.attributeQuery$.refetch();
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

    if(!this.checkIfNewAttribute || this.checkIfNewAttribute == null) {
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
    [this.attributesQuery$, attributes$] = this.projectApolloService.getAttributesByProjectId(projectId, []);
    this.subscriptions$.push(attributes$.subscribe((attributes) => {
      attributes.sort((a, b) => a.relativePosition - b.relativePosition);
      this.attributes = attributes;
      this.attributesUsableUploaded = this.attributes.filter((attribute) => attribute.state == 'UPLOADED' || attribute.state == 'USABLE');
    }));
    return attributes$;
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
