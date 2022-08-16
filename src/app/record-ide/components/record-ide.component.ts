import {
  Component,
  HostListener,
  OnInit,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, first } from 'rxjs/operators';
import { RouteService } from 'src/app/base/services/route.service';
import { ActivatedRoute, Router, Event, NavigationEnd } from '@angular/router';
import { Project } from 'src/app/base/entities/project';
import { FormControl } from '@angular/forms';
import { RecordApolloService } from 'src/app/base/services/record/record-apollo.service';
import { ProjectApolloService } from 'src/app/base/services/project/project-apollo.service';
import { bool } from 'aws-sdk/clients/signer';


@Component({
  selector: 'kern-record-ide',
  templateUrl: './record-ide.component.html',
  styleUrls: ['./record-ide.component.scss'],
})
export class RecordIDEComponent implements OnInit {

  codeFormCtrl = new FormControl('');
  editorOptions = { theme: 'vs-light', language: 'python' };
  code: string = '# record is a pre-set variable which you can explore in this editor\n# you can access specific attributes via dictionary access\n# the record has the same format as a record entered into a labeling function\nprint(record)';

  project: Project;
  project$: any;
  session: any;
  subscriptions$: Subscription[] = [];
  output: string;
  loading: bool;
  labelingUrl: string;
  screenHeight: string;
  position;
  sessionData: {
    recordIds: string[],
    sessionId: string,
    partial: boolean,
    projectId: string,
    currentPos: number
  };
  snakeActive: boolean = false;
  vertical: boolean = true;


  constructor(
    private routeService: RouteService,
    private activatedRoute: ActivatedRoute,
    private recordApolloService: RecordApolloService,
    private projectApolloService: ProjectApolloService,
    private router: Router,
  ) {
    this.router.events.subscribe((event: Event) => {
      if (event instanceof NavigationEnd) {
        this.setLabelingUrlAndPos()
      }
    });
  }

  ngOnInit(): void {
    this.sessionData = JSON.parse(localStorage.getItem("sessionData"));
    this.routeService.updateActivatedRoute(this.activatedRoute);
    this.session = this.activatedRoute.snapshot.paramMap.get("sessionId");
    const projectId = this.activatedRoute.parent.snapshot.paramMap.get('projectId');
    this.prepareProject(projectId);
    const existingCode = localStorage.getItem("ideCode");
    if (existingCode) this.code = existingCode;
    const horizontal = JSON.parse(localStorage.getItem("ideHorizontal"));
    if (horizontal) {
      this.vertical = !horizontal;
    }
    this.changeScreenSize();
  }

  initEditor() {
    this.codeFormCtrl.valueChanges
      .pipe(
        debounceTime(1000), //5 sec
        distinctUntilChanged()
      )
      .subscribe(() => {
        localStorage.setItem("ideCode", this.code);
      });
  }

  switchView() {
    localStorage.setItem("ideHorizontal", JSON.stringify(this.vertical));
    location.reload();
  }

  setLabelingUrlAndPos(): void {
    const labelingUrlFull = this.activatedRoute.snapshot['_routerState'].url.replace("record-ide", "labeling");
    const posIndex = /\?pos/.exec(labelingUrlFull).index;
    this.position = parseInt(labelingUrlFull.substring(posIndex + 5)); // get rid of "?pos=" (5 chars)
    this.labelingUrl = labelingUrlFull.substring(0, posIndex);
  }

  prepareProject(projectId: string) {
    this.project$ = this.projectApolloService.getProjectById(projectId);
    this.subscriptions$.push(this.project$.subscribe((project) => {
      this.project = project;
      this.runRecordIde(true);
    }));
    return this.project$.pipe(first());
  }

  runRecordIde(firstVisit: bool = false) {
    if (!firstVisit && this.code.indexOf("import easteregg") != -1) {
      this.snakeActive = true;
    } else {
      this.loading = true;
      const recordId = this.sessionData.recordIds[this.position - 1]
      this.recordApolloService.runRecordIDE(this.project.id, recordId, this.code).subscribe(({ data, loading }) => {
        this.output = data["runRecordIde"];
        this.loading = false;
      });
    }
  }

  clearIde() {
    this.output = "";
  }

  @HostListener('window:resize', ['$event'])
  getScreenSize(event?) {
    this.changeScreenSize();
  }

  changeScreenSize() {
    const baseSize = (window.innerHeight - 125);
    if (this.vertical) {
      this.screenHeight = baseSize + "px";
    } else {
      this.screenHeight = baseSize / 2 + "px";
    }
  }

  @HostListener('window:keydown', ['$event'])
  shortcutRunIde(event: KeyboardEvent) {
    if (event.shiftKey && event.key === "Enter") {
      this.runRecordIde();
      event.preventDefault();
      event.stopPropagation();
    }
  }

  goToLabelingPage() {
    this.router.navigate(["projects", this.project.id, "labeling", this.session], { queryParams: { pos: this.position } });
  }

  nextRecord() {
    this.clearIde();
    this.router.navigate(["projects", this.project.id, "record-ide", this.session], { queryParams: { pos: Math.min(this.position + 1, this.sessionData.recordIds.length) } });
    setTimeout(() => this.runRecordIde(), 200);
  }

  prevRecord() {
    this.clearIde();
    this.router.navigate(["projects", this.project.id, "record-ide", this.session], { queryParams: { pos: Math.max(this.position - 1, 1) } });
    setTimeout(() => this.runRecordIde(), 200);
  }

}

