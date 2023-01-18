import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
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
import { LabelingSuiteOverviewTableComponent } from '../sub-components/overview-table/overview-table.component';

@Component({
  selector: 'kern-labeling-suite',
  templateUrl: './labeling-suite.component.html',
  styleUrls: ['./labeling-suite.component.scss'],
})
export class LabelingSuiteComponent implements OnInit, OnDestroy {


  //HTML enums
  userRoleEnum: typeof UserRole = UserRole;
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

    this.lsm = new LabelingSuiteManager(projectId, this.projectApolloService, this.recordApolloService, this);
    const recordId = '07837035-a31c-4e3f-bc6f-3c86637f6def';
    this.lsm.recordManager.collectRecordData(recordId);
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
    throw new Error("Method not implemented.");
    // const sessionId = this.labelingLinkData.id;
    // const pos = this.labelingLinkData.requestedPos;

    // this.router.navigate(["projects", this.project.id, "record-ide", sessionId], { queryParams: { pos: pos } });
  }

  public nextRecord() {
    throw new Error("Method not implemented.");

  }

  public previousRecord() {
    throw new Error("Method not implemented.");

  }



}
