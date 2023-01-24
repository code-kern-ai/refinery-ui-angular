import { AfterViewInit, Component, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  CommentDataManager,
  CommentType,
} from 'src/app/base/components/comment/comment-helper';
import { UserRole } from 'src/app/base/enum/graphql-enums';
import { ProjectApolloService } from 'src/app/base/services/project/project-apollo.service';
import { RecordApolloService } from 'src/app/base/services/record/record-apollo.service';
import { findProjectIdFromRoute } from 'src/app/util/helper-functions';
import { UserManager } from 'src/app/util/user-manager';
import { LabelingSuiteManager } from '../helper/manager/manager';
import { ComponentType } from '../helper/manager/settings';
import { UserType } from '../helper/manager/user';
import { LabelingSuiteOverviewTableComponent } from '../sub-components/overview-table/overview-table.component';

@Component({
  selector: 'kern-labeling-suite',
  templateUrl: './labeling-suite.component.html',
  styleUrls: ['./labeling-suite.component.scss'],
})
export class LabelingSuiteComponent implements OnInit, OnDestroy {


  //HTML enums
  userRoleEnum: typeof UserRole = UserRole;
  userTypeEnum: typeof UserType = UserType;
  componentTypeEnum: typeof ComponentType = ComponentType;


  //manager
  lsm: LabelingSuiteManager;


  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private recordApolloService: RecordApolloService,
    private projectApolloService: ProjectApolloService,) { }


  ngOnDestroy() {
    this.lsm.doBeforeDestroy();
    CommentDataManager.unregisterAllCommentRequests(this);
  }

  ngOnInit(): void {
    const projectId = findProjectIdFromRoute(this.activatedRoute);
    if (!projectId) {
      console.log("No project id found in route. Redirecting to project overview.");
      this.router.navigate(['/']);
      return;
    }
    this.lsm = new LabelingSuiteManager(projectId, this, this.activatedRoute, this.router, this.projectApolloService, this.recordApolloService);
    this.setUpCommentRequests(projectId);
  }


  private setUpCommentRequests(projectId: string) {
    const requests = [];
    requests.push({
      commentType: CommentType.LABELING_TASK,
      projectId: projectId,
    });
    requests.push({ commentType: CommentType.ATTRIBUTE, projectId: projectId });
    requests.push({ commentType: CommentType.LABEL, projectId: projectId });
    requests.push({ commentType: CommentType.HEURISTIC, projectId: projectId });
    CommentDataManager.registerCommentRequests(this, requests);
  }

  //function shorthands
  public toggleShowHeuristics() {
    this.lsm.settingManager.changeSetting(ComponentType.OVERVIEW_TABLE, 'showHeuristics');
  }
  public toggleAutoNextRecord() {
    this.lsm.settingManager.changeSetting(ComponentType.MAIN, 'autoNextRecord');
  }
  public setShowNLabelButton(value: number) {
    this.lsm.settingManager.changeSetting(ComponentType.LABELING, 'showNLabelButton', value);
  }

  public changeSetting(component: ComponentType, setting: string, value?: any) {
    this.lsm.settingManager.changeSetting(component, setting, value);
  }


  //navigation
  public goToRecordIde() {
    this.lsm.sessionManager.goToRecordIde();
  }

  public nextRecord() {
    this.lsm.nextRecord();

  }

  public previousRecord() {
    this.lsm.previousRecord();
  }

  @HostListener('document:keyup', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (event.getModifierState('Control')) return;

    if (event.key == 'ArrowRight') {
      this.nextRecord();
    } else if (event.key == 'ArrowLeft') {
      this.previousRecord();
    }
    if ('123456789'.includes(event.key)) {
      const selectedPos = Number(event.key) - 1;
      this.lsm.userManager.selectUserByIdx(selectedPos);
    }

  }


}
