import { Component, ElementRef, HostListener, OnDestroy, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { ActivatedRoute, ActivatedRouteSnapshot, CanDeactivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { RouteService } from 'src/app/base/services/route.service';
import { NotificationService } from 'src/app/base/services/notification.service';
import { Observable, Subscription, forkJoin, timer } from 'rxjs';
import { UserManager } from 'src/app/util/user-manager';
import { findProjectIdFromRoute } from 'src/app/util/helper-functions';
import { first } from 'rxjs/operators';
import { ProjectApolloService } from 'src/app/base/services/project/project-apollo.service';
import { EditRecordComponentData, EditRecordSessionData, createDefaultEditRecordComponentData } from './edit-records-helper';
import { RecordApolloService } from 'src/app/base/services/record/record-apollo.service';
import { scrollElementIntoView } from 'submodules/javascript-functions/scrollHelper';
import { CanComponentDeactivate, CanDeactivateGuard } from 'src/app/util/CanComponentDeactivate';
import { jsonCopy } from 'submodules/javascript-functions/general';

@Component({
  selector: 'kern-edit-records',
  templateUrl: './edit-records.component.html',
  styleUrls: ['./edit-records.component.scss'],
})
export class EditRecordsComponent implements OnInit, OnDestroy, CanDeactivateGuard {
  public static sessionData: EditRecordSessionData;

  subscriptions$: Subscription[] = [];

  erd: EditRecordComponentData = createDefaultEditRecordComponentData();

  constructor(
    private activatedRoute: ActivatedRoute,
    private routeService: RouteService,
    // private projectApolloService: ProjectApolloService,
    private recordApolloService: RecordApolloService,
    private router: Router
  ) { }
  // since our managed app has 15 comments in total & only 1 on a record ill skip comment integration for the moment
  ngOnDestroy(): void {
    this.subscriptions$.forEach((subscription) => subscription.unsubscribe());
    NotificationService.unsubscribeFromNotification(this, this.erd.projectId);
  }

  // guard against page leave
  canDeactivate(component: CanComponentDeactivate): boolean | Promise<boolean> | Observable<boolean> {
    return Object.keys(this.erd.cachedRecordChanges).length == 0 || confirm("You have unsaved changes. Are you sure you want to leave?");
  }

  @HostListener('window:beforeunload', ['$event'])
  unload($event: any) {
    if (Object.keys(this.erd.cachedRecordChanges).length > 0) {
      $event.returnValue = "You have unsaved changes. Are you sure you want to leave?"
    }
  }


  ngOnInit(): void {
    UserManager.checkUserAndRedirect(this); //only engineers
    this.erd.projectId = findProjectIdFromRoute(this.activatedRoute);
    if (!EditRecordsComponent.sessionData) {
      console.warn("No session data available. Redirecting to data browser.");
      this.router.navigate(["../" + this.erd.projectId + "/data"],
        { relativeTo: this.activatedRoute.parent });
      return;
    }
    this.routeService.updateActivatedRoute(this.activatedRoute);
    if (!this.erd.projectId) {
      console.error("No project id found in route. Redirecting to projects overview.");
      this.router.navigate(['/']);
      return;
    }
    NotificationService.subscribeToNotification(this, {
      projectId: this.erd.projectId,
      whitelist: ['calculate_attribute'],
      func: this.handleWebsocketNotification
    });
    this.erd.data = EditRecordsComponent.sessionData;
    this.erd.displayRecords = jsonCopy(this.erd.data.records);
    this.erd.editRecordId = this.erd.data.selectedRecordId;
    this.erd.navBar.positionString = this.erd.data.records.length + " records in";
    console.log(this.erd)
    scrollElementIntoView("flash-it", 50);
    // this.collectAttributes();
  }

  nextColumnClass() {
    switch (this.erd.columnClass) {
      case "grid-cols-1": this.erd.columnClass = "grid-cols-2"; break;
      case "grid-cols-2": this.erd.columnClass = "grid-cols-3"; break;
      case "grid-cols-3": this.erd.columnClass = "grid-cols-1"; break;
      default: this.erd.columnClass = "grid-cols-3";
    }

    localStorage.setItem("ERcolumnClass", this.erd.columnClass);
    this.erd.data.selectedRecordId = null;
    if (this.erd.editRecordId) timer(100).subscribe(() => this.erd.data.selectedRecordId = this.erd.editRecordId);
    scrollElementIntoView("flash-it", 50);
  }

  addCache(recordId: string, attributeName: string, newValue: any, subKey?: number) {

    const idx2 = this.erd.displayRecords.findIndex((record) => record.id == recordId);
    if (idx2 == -1) {
      console.error("record not found (addCache)")
      return;
    }
    if (subKey != undefined && this.erd.displayRecords[idx2].data[attributeName][subKey] == newValue) return;
    if (subKey == undefined && this.erd.displayRecords[idx2].data[attributeName] == newValue) return;

    const accessKey = this.buildAccessKey(recordId, attributeName, subKey);
    const current = this.erd.cachedRecordChanges[accessKey];

    if (!current) {
      const record = this.erd.data.records.find((record) => record.id == recordId);
      const cacheItem: any = {
        recordId: recordId,
        attributeName: attributeName,
        newValue: newValue,
        subKey: subKey,
        display: {
          record: record.data[this.erd.data.attributes[0].name],
          oldValue: record.data[attributeName],
        }
      };
      if (subKey != undefined) {
        cacheItem.display.oldValue = cacheItem.display.oldValue[subKey];
        cacheItem.display.subKeyAdd = "[" + subKey + "]";
      }
      this.erd.cachedRecordChanges[accessKey] = cacheItem;
      if (!this.erd.modals.hideExplainModal && Object.keys(this.erd.cachedRecordChanges).length == 1) {
        this.erd.modals.explainModalOpen = true;
        this.erd.modals.hideExplainModal = true;
      }

    } else {
      this.erd.cachedRecordChanges[accessKey].newValue = newValue;
    }
    console.log(this.erd.cachedRecordChanges)
    if (subKey != undefined) this.erd.displayRecords[idx2].data[attributeName][subKey] = newValue;
    else this.erd.displayRecords[idx2].data[attributeName] = newValue;

  }

  buildAccessKey(recordId: string, attributeName: string, subKey?: number) {
    if (subKey == undefined) return recordId + "@" + attributeName;
    else return recordId + "@" + attributeName + "@" + subKey;
  }

  closeModalAndNeverShowAgain() {
    localStorage.setItem("ERhideExplainModal", "X");
    this.erd.modals.hideExplainModal = true;
    this.erd.modals.explainModalOpen = false;
  }

  syncChanges() {
    console.log("sync called", this.erd.cachedRecordChanges)
    this.erd.errors = null;
    this.erd.syncing = true;
    const changes = jsonCopy(this.erd.cachedRecordChanges);

    for (const key in changes) delete changes[key].display;

    this.recordApolloService.editRecords(this.erd.projectId, JSON.stringify(changes)).pipe(first()).subscribe((result: any) => {
      const tmp = result?.data?.editRecords;
      if (tmp?.ok) {
        this.erd.data.records = jsonCopy(this.erd.displayRecords);
        this.erd.cachedRecordChanges = {};
        this.erd.modals.syncModalAmount = Object.keys(this.erd.cachedRecordChanges).length;
      } else {
        if (tmp) this.erd.errors = tmp.error
        else this.erd.errors = ["Request didn't go through"]
      }
      this.erd.syncing = false;
    });
  }

  openSyncModal() {
    this.erd.modals.syncModalOpen = true;
    this.erd.modals.syncModalAmount = Object.keys(this.erd.cachedRecordChanges).length;
  }

  removeFromCache(key: string) {
    const keyParts = key.split("@");
    const recordId = keyParts[0];
    const r1 = this.erd.displayRecords.find((record) => record.id == recordId);
    const r2 = this.erd.data.records.find((record) => record.id == recordId);
    if (!r1 || !r2) return;
    const attributeName = keyParts[1];
    const subKey = keyParts.length == 3 ? parseInt(keyParts[2]) : null;
    if (subKey != undefined) r1.data[attributeName][subKey] = r2.data[attributeName][subKey];
    else r1.data[attributeName] = r2.data[attributeName];

    delete this.erd.cachedRecordChanges[key];
    this.erd.modals.syncModalAmount = Object.keys(this.erd.cachedRecordChanges).length;
  }

  // websocket

  handleWebsocketNotification(msgParts) {
    if (msgParts[1] == 'calculate_attribute' && msgParts[2] == 'finished') {
      window.location.reload();
      this.alertUser(msgParts[1]);
    }
  }

  alertLastVisible: number;
  alertUser(msgId: string) {
    if (this.alertLastVisible && Date.now() - this.alertLastVisible < 1000) return;
    alert("Settings were changed (msgId: " + msgId + ")\nPage will be reloaded.");
    this.alertLastVisible = Date.now();
  }

}
