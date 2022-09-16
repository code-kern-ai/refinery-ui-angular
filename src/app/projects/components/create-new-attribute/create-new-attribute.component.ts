import { Component, ElementRef, OnInit, QueryList, ViewChildren } from '@angular/core';
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
  editorOptions = { theme: 'vs-light', language: 'python' };
  attributeLogs: any;
  testerRequestedSomething: boolean = false;
  canRunProject: boolean = false;
  sampleRecords: any;
  code: string = '';

  constructor( 
    private activatedRoute: ActivatedRoute,
    private projectApolloService: ProjectApolloService,
    private routeService: RouteService,
    private router: Router) { }

  ngOnInit(): void {
    this.routeService.updateActivatedRoute(this.activatedRoute);
    const projectId = this.activatedRoute.parent.snapshot.paramMap.get('projectId');
    const attributeId = this.activatedRoute.snapshot.paramMap.get('attributeId');
    const project$ = this.projectApolloService.getProjectById(projectId);
    let tasks$ = [];
    tasks$.push(project$.pipe(first()));
    tasks$.push(this.prepareAttributes(projectId, attributeId));

    this.subscriptions$.push(project$.subscribe((project) => this.project = project));
    combineLatest(tasks$).subscribe();

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
    // TODO: add all notifications that are part of the component
    let toReturn = [];
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

  prepareAttributes(projectId: string, attributeId: string) {
    [this.attributeQuery$, this.attribute$] = this.projectApolloService.getAttributeByAttributeId(projectId, attributeId);
    this.subscriptions$.push(this.attribute$.subscribe((attribute) => {
      this.attribute = attribute;
      this.attributeName = this.attribute.name;
      this.code = this.attribute.sourceCode;
      if (this.code == null) {
        this.code = AttributeCodeLookup.getAttributeCalculationTemplate(AttributeCalculationExamples.AC_EMPTY_TEMPLATE, this.attributeName).code;
      }
      this.attributeLogs = this.attribute.logs;
      this.canRunProject = this.attribute.sourceCode !== '';
    }));
  }

  openName(open: boolean, projectId) {
    this.nameOpen = open;
    if (!open && this.attributeName != this.attribute.name) {
      this.saveAttribute(projectId);
    }
  }

  getPythonClassRegExMatch(codeToCheck: string): any {
    return /class ([\w]+)\([^)]+\):/.exec(codeToCheck);
  }

  toPythonFunctionName(str: string) {
    return str.replace(/\s+/g, '_').replace(/[^\w]/gi, '').trim();
  }

  saveAttribute(projectId: string) {
    this.code = AttributeCodeLookup.getAttributeCalculationTemplate(AttributeCalculationExamples.AC_EMPTY_TEMPLATE, this.attributeName).code;
    this.projectApolloService
      .updateAttribute(projectId, this.attribute.id, this.attribute.dataType, this.attribute.isPrimaryKey, this.attributeName, this.code)
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
    if (this.attributeName != this.attribute.name || this.code != this.attribute.sourceCode) return true;
    return false;
  }

  deleteUserAttribute(projectId, attributeId) {
    this.projectApolloService
      .deleteUserAttribute(projectId, attributeId)
      .pipe(first())
      .subscribe(() => {
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
      });
  }

  calculateUserAttributeAllRecords() {
    this.projectApolloService
    .calculateUserAttributeAllRecords(this.project.id, this.attribute.id)
    .pipe(first())
    .subscribe();
  }

  handleWebsocketNotification(msgParts) {
    // TO DO: handle websocket notification (depends on which notifications are subscribed to)
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

    return codeToSave.replace(regMatch[0], 'def ac(record)');
  }

  getPythonFunctionRegExMatch(codeToCheck: string): any {
    return /(def)\s(\w+)\([a-zA-Z0-9_:\[\]=, ]*\)/.exec(codeToCheck);
  }


}
