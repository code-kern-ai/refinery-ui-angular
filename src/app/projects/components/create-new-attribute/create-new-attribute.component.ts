import { Component, ElementRef, OnInit, QueryList, ViewChildren } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProjectApolloService } from 'src/app/base/services/project/project-apollo.service';
import { RouteService } from 'src/app/base/services/route.service';
import { first } from 'rxjs/operators';
import { combineLatest, Subscription } from 'rxjs';
import { FormControl } from '@angular/forms';
import {
  debounceTime,
  startWith,
  distinctUntilChanged,
} from 'rxjs/operators';

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
  lastTask$: any;
  lastTaskQuery$: any;
  testerRequestedSomething: boolean = false;
  canRunProject: boolean = false;
  recordTestResult: any;
  random10RecordsResult: any;

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
    tasks$.push(this.prepareLastRun(projectId, attributeId))

    this.subscriptions$.push(project$.subscribe((project) => this.project = project));
    combineLatest(tasks$).subscribe();

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
      this.canRunProject = this.attribute.codeColumn !== '';
    }));
  }

  prepareLastRun(projectId: string, attributeId: string) {
    [this.lastTaskQuery$, this.lastTask$] = this.projectApolloService.getLastRunByAttributeId(projectId, attributeId);
    this.subscriptions$.push(this.lastTask$.subscribe());
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
    this.projectApolloService
      .updateAttribute(projectId, this.attribute.id, this.attribute.dataType, this.attribute.isPrimaryKey, this.attributeName)
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
    return false
  }

  deleteAttribute(projectId, attributeId) {
    this.projectApolloService
      .deleteAttribute(projectId, attributeId)
      .pipe(first())
      .subscribe(() => {
        this.router.navigate(["../../settings"], { relativeTo: this.activatedRoute });
      });
  }

  copyToClipboard(textToCopy: string) {
    navigator.clipboard.writeText(textToCopy);
  }

  runAttributeTest(text: string) {
    if (text.length == 0) return;
    if (this.testerRequestedSomething) return;
    this.testerRequestedSomething = true;
    this.projectApolloService
      .runAttributeTest(this.project.id, this.attribute.id, text).pipe(first()).subscribe((testResult) => {
        this.recordTestResult = testResult;
        this.testerRequestedSomething = false;
      });
  }

  runAttribute10Records() {
    if (this.testerRequestedSomething) return;
    this.testerRequestedSomething = true;
    this.projectApolloService
      .runAttribute10Records(this.project.id, this.attribute.id).pipe(first()).subscribe((records10) => {
        this.random10RecordsResult = records10;
        this.testerRequestedSomething = false;
      });
  }

  runAttributeAllRecords() {
    this.projectApolloService
    .runAttributeAllRecords(this.project.id, this.attribute.id)
    .pipe(first())
    .subscribe();
  }

}
