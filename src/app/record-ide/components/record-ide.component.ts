import {
  Component,
  HostListener,
  OnInit,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { first } from 'rxjs/operators';
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
  firstVisit: boolean = true;


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
    this.getScreenSize();
    this.sessionData = JSON.parse(localStorage.getItem("sessionData"));
    this.routeService.updateActivatedRoute(this.activatedRoute);
    this.session = this.activatedRoute.snapshot.paramMap.get("sessionId");
    const projectId = this.activatedRoute.parent.snapshot.paramMap.get('projectId');
    this.prepareProject(projectId)
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
      if (this.firstVisit) {
        this.runRecordIde();
        this.firstVisit = false;
      }
    }));
    return this.project$.pipe(first());
  }

  runRecordIde() {
    if (this.code.indexOf("import easteregg") != -1) {
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
    this.screenHeight = window.innerHeight + "px";
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
  }

  prevRecord() {
    this.clearIde();
    this.router.navigate(["projects", this.project.id, "record-ide", this.session], { queryParams: { pos: Math.max(this.position - 1, 1) } });
  }

  navigateToTemplates() {
    window.open("https://github.com/code-kern-ai/template-functions", "_blank");
  }

  navigateToLibraries() {
    window.open("https://github.com/code-kern-ai/record-ide/blob/dev/requirements.txt", "_blank");
  }

}

