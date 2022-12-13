import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  CommentDataManager,
  CommentType,
} from 'src/app/base/components/comment/comment-helper';
import { ProjectApolloService } from 'src/app/base/services/project/project-apollo.service';
import { RecordApolloService } from 'src/app/base/services/record/record-apollo.service';
import { findProjectIdFromRoute } from 'src/app/util/helper-functions';
import { LabelingDataHandler } from '../helper/data-handler';
import { getDefaultLabelingSuiteSettings, LabelingSuiteSettings } from '../helper/settings';
import { LabelingSuiteOverviewTableComponent } from '../sub-components/overview-table/overview-table.component';

@Component({
  selector: 'kern-labeling-suite',
  templateUrl: './labeling-suite.component.html',
  styleUrls: ['./labeling-suite.component.scss'],
})
export class LabelingSuiteComponent implements OnInit, AfterViewInit, OnDestroy {

  dataHandler: LabelingDataHandler;
  projectId: string;
  @ViewChild(LabelingSuiteOverviewTableComponent) overviewTable: LabelingSuiteOverviewTableComponent;
  settings: LabelingSuiteSettings;

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private recordApolloService: RecordApolloService,
    private projectApolloService: ProjectApolloService,) { }


  ngOnDestroy() {
    this.dataHandler.unsubscribeFromWebsocket();
    localStorage.setItem("labelingSuiteSettings", JSON.stringify(this.prepareDataForSave()));
  }

  ngOnInit(): void {
    this.projectId = findProjectIdFromRoute(this.activatedRoute);
    if (!this.projectId) {
      console.log("No project id found in route. Redirecting to project overview.");
      this.router.navigate(['/']);
      return;
    }

    this.dataHandler = new LabelingDataHandler(this.projectId, this.projectApolloService, this.recordApolloService, this);
    const recordId = '10596828-ca39-47d8-b55a-cbafe3fb6e45';//'c1211488-6718-4d08-be76-58019ba909a1';
    this.dataHandler.collectRecordData(recordId);
  }
  ngAfterViewInit(): void {
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

}
