import { AfterViewChecked, ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { first } from 'rxjs/operators';
import { NotificationService } from 'src/app/base/services/notification.service';
import { OrganizationApolloService } from 'src/app/base/services/organization/organization-apollo.service';
import { ProjectApolloService } from 'src/app/base/services/project/project-apollo.service';
import { Project } from 'src/app/base/entities/project';
import { RouteService } from 'src/app/base/services/route.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, timer } from 'rxjs';
import { ConfigManager } from 'src/app/base/services/config-service';
import { getUserAvatarUri } from 'src/app/util/helper-functions';
import { UploadFileType, UploadType } from 'src/app/import/components/helpers/upload-types';

@Component({
  selector: 'kern-project-new',
  templateUrl: './project-new.component.html',
  styleUrls: ['./project-new.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectNewComponent implements OnInit, AfterViewChecked {

  get UploadFileType(): typeof UploadFileType {
    return UploadFileType;
  }

  user$: any;
  subscriptions$: Subscription[] = [];
  tokenizerValues = [];
  project: Project;
  projectNameList$;
  projectNameListQuery$: any;
  projectNameList: Project[] = [];
  organizationName: string;
  organizationInactive: boolean;
  avatarUri: string;

  constructor(
    private routeService: RouteService,
    private activatedRoute: ActivatedRoute,
    private organizationApolloService: OrganizationApolloService,
    private projectApolloService: ProjectApolloService,
    private cdRef: ChangeDetectorRef) { }

  ngAfterViewChecked(): void {
    this.cdRef.detectChanges();
  }

  ngOnInit(): void {
    this.routeService.updateActivatedRoute(this.activatedRoute);

    this.organizationApolloService
      .getUserOrganization()
      .pipe(first()).subscribe((org) => {
        this.organizationInactive = org == null;
        if (!this.organizationInactive) {
          this.organizationName = org.name;
        }
      });

    this.organizationApolloService.getUserInfo().pipe(first())
      .subscribe((user) => {
        this.avatarUri = getUserAvatarUri(user);
      });

    [this.projectNameListQuery$, this.projectNameList$] = this.projectApolloService.getProjects();
    this.subscriptions$.push(this.projectNameList$.subscribe((projectList) => {
      this.projectNameList = projectList;
    }));

    NotificationService.subscribeToNotification(this, {
      whitelist: ['project_created', 'project_deleted', 'project_update', 'file_upload'],
      func: this.handleWebsocketNotification
    });

    this.projectApolloService
      .getAllTokenizerOptions()
      .pipe(first())
      .subscribe((v) => {
        this.tokenizerValues = this.checkWhitelistTokenizer(v);
      });
  }

  handleWebsocketNotification(msgParts) {
    if (!this.projectNameListQuery$) return;
    if (['project_created', 'project_deleted', 'project_update'].includes(msgParts[1])) {
      this.projectNameListQuery$.refetch();
    }
  }

  getFirstName(userName) {
    this.user$ = userName;
  }

  ngOnDestroy(): void {
    this.subscriptions$.forEach(subscription => subscription.unsubscribe());
    NotificationService.unsubscribeFromNotification(this);
  }

  checkWhitelistTokenizer(tokenizer) {
    if (!ConfigManager.isInit()) {
      timer(250).subscribe(() => this.tokenizerValues = this.checkWhitelistTokenizer(tokenizer));
      return null;
    }
    tokenizer = Array.from(tokenizer);
    const allowedConfigs = ConfigManager.getConfigValue("spacy_downloads");
    for (let i = 0; i < tokenizer.length; i++) {
      tokenizer[i] = { ...tokenizer[i] };
      tokenizer[i].disabled = !allowedConfigs.includes(tokenizer[i].configString);
    }
    tokenizer.sort((a, b) => (+a.disabled) - (+b.disabled) || a.configString.localeCompare(b.configString));

    let firstNotAvailable = true;
    let insertPos = -1;
    for (let i = 0; i < tokenizer.length; i++) {
      const t = tokenizer[i];
      if (t.disabled) {
        if (firstNotAvailable) {
          insertPos = i;
          firstNotAvailable = false;
        }
      } else t.disabled = null;
    }

    if (insertPos != -1) {
      tokenizer.splice(insertPos, 0, { disabled: true, name: "------------------------------------------" });
      if (ConfigManager.getIsManaged()) {
        tokenizer.splice(insertPos, 0, { disabled: true, name: "if you need the options below feel free to contact us", configString: "intercom/email" });
      } else {
        tokenizer.splice(insertPos, 0, { disabled: true, name: "add further options on config page" });
      }
      tokenizer.splice(insertPos, 0, { disabled: true, name: "------------------------------------------" });
    }

    return tokenizer
  }

}
