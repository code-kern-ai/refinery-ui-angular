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
import { LabelingDataHandler } from '../helper/data-handler';
import { getDefaultLabelingSuiteSettings, LabelingSuiteSettings } from '../helper/settings';
import { LabelingSuiteOverviewTableComponent } from '../sub-components/overview-table/overview-table.component';

@Component({
  selector: 'kern-labeling-suite',
  templateUrl: './labeling-suite.component.html',
  styleUrls: ['./labeling-suite.component.scss'],
})
export class LabelingSuiteComponent implements OnInit, AfterViewInit, OnDestroy {


  //HTML enums
  userRoleEnum: typeof UserRole = UserRole;


  //class/variables
  dm: LabelingDataHandler;
  projectId: string;
  settings: LabelingSuiteSettings;

  //children
  @ViewChild(LabelingSuiteOverviewTableComponent) overviewTable: LabelingSuiteOverviewTableComponent;

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private recordApolloService: RecordApolloService,
    private projectApolloService: ProjectApolloService,) { }


  ngOnDestroy() {
    this.dm.destroyToDos();
    localStorage.setItem("labelingSuiteSettings", JSON.stringify(this.prepareDataForSave()));
  }

  ngOnInit(): void {
    this.projectId = findProjectIdFromRoute(this.activatedRoute);
    if (!this.projectId) {
      console.log("No project id found in route. Redirecting to project overview.");
      this.router.navigate(['/']);
      return;
    }

    this.dm = new LabelingDataHandler(this.projectId, this.projectApolloService, this.recordApolloService, this);
    const recordId = 'c58430f5-c9fe-4e3d-9324-cae2d61b7cbc';
    this.dm.collectRecordData(recordId);

    // console.log("add very first time info (+arcade link?)")
  }

  ngAfterViewInit(): void {
    //too early to load since subcomponents are not initialized/ existing yet
    //maybe loading should only load instance in this component and then run remaining on init event?
    this.loadSettings();
  }

  private prepareDataForSave(): any {
    let toSave = {};
    this.overviewTable.extendSettingsForSave(toSave);
    return toSave;
  }
  private loadSettings() {
    let tmp = localStorage.getItem("labelingSuiteSettings");
    if (tmp) this.settings = JSON.parse(tmp);
    else this.settings = getDefaultLabelingSuiteSettings();
    this.overviewTable.setPageSettings(this.settings);

  }


  // private setUpCommentRequests(projectId: string) {
  //   const requests = [];
  //   requests.push({
  //     commentType: CommentType.LABELING_TASK,
  //     projectId: projectId,
  //   });
  //   requests.push({ commentType: CommentType.ATTRIBUTE, projectId: projectId });
  //   requests.push({ commentType: CommentType.LABEL, projectId: projectId });
  //   requests.push({ commentType: CommentType.HEURISTIC, projectId: projectId });
  //   CommentDataManager.registerCommentRequests(this, requests);
  // }


  public setOverviewTableData(data: any[]) {
    this.overviewTable.prepareDataToDisplay(data);
  }



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
