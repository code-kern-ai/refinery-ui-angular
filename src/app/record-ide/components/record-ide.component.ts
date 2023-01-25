import {
  Component,
  HostListener,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { Subscription, timer } from 'rxjs';
import { debounceTime, distinctUntilChanged, first } from 'rxjs/operators';
import { RouteService } from 'src/app/base/services/route.service';
import { ActivatedRoute, Router, Event, NavigationEnd } from '@angular/router';
import { Project } from 'src/app/base/entities/project';
import { FormControl } from '@angular/forms';
import { RecordApolloService } from 'src/app/base/services/record/record-apollo.service';
import { ProjectApolloService } from 'src/app/base/services/project/project-apollo.service';
import { bool } from 'aws-sdk/clients/signer';
import { UserManager } from 'src/app/util/user-manager';
import { CommentDataManager, CommentType } from 'src/app/base/components/comment/comment-helper';
import { caesarCipher, PASS_ME } from 'src/app/util/cipher';
import { tryParseJSON } from 'src/app/util/helper-functions';
import { LabelingHuddle, LabelingLinkData, parseLabelingLinkData } from 'src/app/labeling-suite/helper/manager/session';


@Component({
  selector: 'kern-record-ide',
  templateUrl: './record-ide.component.html',
  styleUrls: ['./record-ide.component.scss'],
})
export class RecordIDEComponent implements OnInit, OnDestroy {

  codeFormCtrl = new FormControl('# record is a pre-set variable which you can explore in this editor\n# you can access specific attributes via dictionary access\n# the record has the same format as a record entered into a labeling function\nprint(record)');
  editorOptions = { theme: 'vs-light', language: 'python' };
  project: Project;
  project$: any;
  subscriptions$: Subscription[] = [];
  output: string;
  loading: bool;
  screenHeight: string;
  huddleData: LabelingHuddle;
  linkData: LabelingLinkData;

  snakeActive: boolean = false;
  vertical: boolean = true;
  position: number;
  debounceTimer;
  canLoadFromLocalStorage: boolean = false;

  constructor(
    private routeService: RouteService,
    private activatedRoute: ActivatedRoute,
    private recordApolloService: RecordApolloService,
    private projectApolloService: ProjectApolloService,
    private router: Router,
  ) {

    this.router.events.subscribe((event: Event) => {
      if (event instanceof NavigationEnd) {
        const labelingUrlFull = this.activatedRoute.snapshot['_routerState'].url;
        const posIndex = /\?pos/.exec(labelingUrlFull).index;
        this.position = parseInt(labelingUrlFull.substring(posIndex + 5)); // get rid of "?pos=" (5 chars)
      }
    });

  }
  ngOnDestroy(): void {
    CommentDataManager.unregisterAllCommentRequests(this);
  }

  ngOnInit(): void {
    UserManager.checkUserAndRedirect(this);
    this.huddleData = JSON.parse(localStorage.getItem("huddleData"));
    this.routeService.updateActivatedRoute(this.activatedRoute);
    this.linkData = parseLabelingLinkData(this.activatedRoute);
    this.prepareProject(this.linkData.projectId);
    this.canLoadFromLocalStorage = !!localStorage.getItem("ideCode");
    const horizontal = JSON.parse(localStorage.getItem("ideHorizontal"));
    if (horizontal) {
      this.vertical = !horizontal;
    }
    this.changeScreenSize();
    const projectId = this.activatedRoute.parent.snapshot.paramMap.get('projectId');
    this.setUpCommentRequests(projectId);
  }
  private setUpCommentRequests(projectId: string) {
    const requests = [];
    requests.push({ commentType: CommentType.ATTRIBUTE, projectId: projectId });
    requests.push({ commentType: CommentType.KNOWLEDGE_BASE, projectId: projectId });
    CommentDataManager.registerCommentRequests(this, requests);
  }

  switchView() {
    localStorage.setItem("ideHorizontal", JSON.stringify(this.vertical));
    location.reload();
  }

  loadCodeFromLocalStorage() {
    const existingCode = localStorage.getItem("ideCode");
    if (existingCode) {
      let code = tryParseJSON(existingCode);
      if (!code || !code.code) {
        //old code
        code = existingCode;
      } else {
        code = caesarCipher(code.code, PASS_ME, true);
      }
      this.codeFormCtrl.setValue(code);
    }
    this.runRecordIde();
  }
  saveCodeToLocalStorage() {
    const toSave = { code: caesarCipher(this.codeFormCtrl.value, PASS_ME) };
    localStorage.setItem("ideCode", JSON.stringify(toSave));
  }

  prepareProject(projectId: string) {
    this.project$ = this.projectApolloService.getProjectById(projectId);
    this.subscriptions$.push(this.project$.subscribe((project) => {
      this.project = project;
      this.runRecordIde(true);
    }));
    return this.project$.pipe(first());
  }

  runRecordIde(firstVisit: boolean = false) {
    if (!firstVisit && this.codeFormCtrl.value.indexOf("import easteregg") != -1) {
      this.snakeActive = true;
    } else {
      this.loading = true;
      const recordId = this.huddleData.recordIds[this.linkData.requestedPos - 1]

      if (this.debounceTimer) this.debounceTimer.unsubscribe();
      this.debounceTimer = timer(400).subscribe(() => {
        this.recordApolloService.runRecordIDE(this.project.id, recordId, this.codeFormCtrl.value).subscribe(({ data, loading }) => {
          this.output = data["runRecordIde"];
          this.loading = false;
        });
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
    this.router.navigate(["projects", this.project.id, "labeling", this.linkData.huddleId], { queryParams: { pos: this.linkData.requestedPos, type: 'SESSION' } });
  }

  nextRecord() {
    this.clearIde();
    this.linkData.requestedPos++;
    this.router.navigate(["projects", this.project.id, "record-ide", this.linkData.huddleId],
      { queryParams: { pos: Math.min(this.linkData.requestedPos, this.huddleData.recordIds.length) } });

    this.runRecordIde();
  }

  prevRecord() {
    this.clearIde();
    this.linkData.requestedPos = Math.max(this.linkData.requestedPos - 1, 1);
    this.router.navigate(["projects", this.project.id, "record-ide", this.linkData.huddleId], { queryParams: { pos: this.linkData.requestedPos, type: 'SESSION' } });

    this.runRecordIde();
  }

}

