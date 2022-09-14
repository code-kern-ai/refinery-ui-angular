import { Component, ElementRef, OnInit, QueryList, ViewChildren } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
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

  constructor( 
    private activatedRoute: ActivatedRoute,
    private projectApolloService: ProjectApolloService,
    private routeService: RouteService,) { }

  ngOnInit(): void {
    this.routeService.updateActivatedRoute(this.activatedRoute);
    const projectId = this.activatedRoute.parent.snapshot.paramMap.get('projectId');
    const project$ = this.projectApolloService.getProjectById(projectId);
    let tasks$ = [];
    tasks$.push(project$.pipe(first()));

    this.subscriptions$.push(project$.subscribe((project) => this.project = project));
    combineLatest(tasks$).subscribe(() => this.prepareAttributes(projectId));

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

  prepareAttributes(projectId: string) {
    const attributeId = this.activatedRoute.snapshot.paramMap.get('attributeId');
    [this.attributeQuery$, this.attribute$] = this.projectApolloService.getAttributeByAttributeId(projectId, attributeId);
    this.subscriptions$.push(this.attribute$.subscribe((attribute) => {
      this.attribute = attribute;
      this.attribute.column = 'test';
    }));
  }

  openName(open: boolean, projectId) {
    this.nameOpen = open;
    this.attributeName = this.attribute.name;
    if (!open && this.attributeName != this.attribute.name) {
      // TODO: update code
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
      .updateAttribute(projectId, this.attribute.id, this.attribute.dataType, this.attribute.isPrimaryKey)
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

}
