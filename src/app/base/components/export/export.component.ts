
import { Component, ElementRef, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { timer } from 'rxjs';
import { first } from 'rxjs/operators';
import { DownloadState } from 'src/app/import/services/s3.enums';
import { isStringTrue } from 'src/app/util/helper-functions';
import { ProjectApolloService } from '../../services/project/project-apollo.service';
import { ModalButton, ModalButtonType } from '../modal/modal-helper';



@Component({
  selector: 'kern-export',
  templateUrl: './export.component.html',
  styleUrls: ['./export.component.scss'],

})
export class ExportComponent implements OnInit, OnChanges {

  //if given another export option is available
  @Input() sessionId: string;

  //if not set the values are requested from backend
  @Input() attributes: any[];
  @Input() labelingTasks: any[];

  @Input() projectId: string;




  get DownloadStateType(): typeof DownloadState {
    return DownloadState;
  }



  // @Output() optionClicked = new EventEmitter<string | any>();
  // @ViewChild("backdrop") backdrop: ElementRef;
  // @ViewChild("modalBox") modalBox: ElementRef;


  downloadState: DownloadState = DownloadState.NONE;
  requesting = { labelingTasks: false, attributes: false };
  // requestingSetupData: boolean = false;


  constructor(
    private projectApolloService: ProjectApolloService,
    private activatedRoute: ActivatedRoute,
  ) { }
  ngOnInit(): void {
  }
  ngOnChanges(changes: SimpleChanges): void {
    this.prepareModule();

  }

  private prepareModule() {
    if (!this.projectId) this.projectId = this.findProjectIdFromRoute(this.activatedRoute);
    this.fetchSetupData(this.projectId);
    // console.log(this.findProjectIdFromRoute(this.activatedRoute));

  }

  private fetchSetupData(projectId: string) {
    if (!projectId) {
      console.log("projectId not set -- shouldn't happen");
      return;
    }
    let query, vc;
    if (!this.labelingTasks && !this.requesting.labelingTasks) {
      this.requesting.labelingTasks = true;
      [query, vc] = this.projectApolloService.getLabelingTasksByProjectId(projectId);
      vc.pipe(first()).subscribe((lt) => {
        lt.sort((a, b) => a.relativePosition - b.relativePosition || a.name.localeCompare(b.name))
        this.labelingTasks = lt;
        this.requesting.labelingTasks = false;
      });
    }
    if (!this.attributes && !this.requesting.attributes) {
      this.requesting.attributes = true;
      [query, vc] = this.projectApolloService.getAttributesByProjectId(projectId);
      vc.pipe(first()).subscribe((att) => {
        this.attributes = att;
        this.requesting.attributes = false;
      });
    }
  }


  private findProjectIdFromRoute(route: ActivatedRoute) {
    while (route.parent) {
      route = route.parent;
      if (route.snapshot.params.projectId) {
        return route.snapshot.params.projectId;
      }
    }
  }

  prepareDownload(type: ModalButtonType) {
    throw new Error('Method not implemented.');
    console.log("prepare download");
  }


  requestFileExport(projectId: string): void {
    this.downloadState = DownloadState.PREPARATION;
    this.projectApolloService.exportRecords(projectId).subscribe((e) => {
      this.downloadState = DownloadState.DOWNLOAD;
      const downloadContent = JSON.parse(e);
      this.downloadText('export.json', downloadContent);
      const timerTime = Math.max(2000, e.length * 0.0001);
      timer(timerTime).subscribe(
        () => (this.downloadState = DownloadState.NONE)
      );
    });
  }

  private downloadText(filename, text) {
    if (!text) return;
    const element = document.createElement('a');

    element.setAttribute(
      'href',
      'data:text/plain;charset=utf-8,' + encodeURIComponent(text)
    );
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
  }
}
