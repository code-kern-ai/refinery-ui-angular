import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, timer } from 'rxjs';
import { first } from 'rxjs/operators';
import { NotificationService } from 'src/app/base/services/notification.service';
import { ProjectApolloService } from 'src/app/base/services/project/project-apollo.service';
import { RouteService } from 'src/app/base/services/route.service';
import { UserManager } from 'src/app/util/user-manager';
import { copyToClipboard } from 'src/app/util/helper-functions';
import { ConfigManager } from 'src/app/base/services/config-service';

@Component({
  selector: 'project-admin-admin',
  templateUrl: './project-admin.component.html',
  styleUrls: ['./project-admin.component.scss']
})

export class ProjectAdminComponent implements OnInit, OnDestroy {

  projectName = new FormControl('');
  projectId: any;
  projectQuery$: any;
  project: any;
  personalAccessTokens: any;
  personalAccessTokensQuery$: any;
  newToken: string;
  tokenCopied: boolean = false;
  tokenNameIsDuplicated: boolean;
  subscriptions$: Subscription[] = [];

  constructor(
    private routeService: RouteService,
    private activatedRoute: ActivatedRoute,
    private projectApolloService: ProjectApolloService,
    private router: Router
  ) { }


  ngOnDestroy(): void {
    this.subscriptions$.forEach((subscription) => subscription.unsubscribe());
    const projectId = this.project?.id ? this.project.id : this.activatedRoute.parent.snapshot.paramMap.get('projectId');
    NotificationService.unsubscribeFromNotification(this, projectId);
  }

  ngOnInit(): void {
    this.checkUserIsAuthorized();
    this.routeService.updateActivatedRoute(this.activatedRoute);

    this.projectId = this.activatedRoute.parent.snapshot.paramMap.get('projectId');

    NotificationService.subscribeToNotification(this, {
      projectId: this.projectId,
      whitelist: ["pat"],
      func: this.handleWebsocketNotification
    });

    let personalAccessTokens$;
    [this.personalAccessTokensQuery$, personalAccessTokens$] = this.projectApolloService.getAllPersonalAccessTokens(this.projectId);
    this.subscriptions$.push(personalAccessTokens$.subscribe((personalAccessTokens) => { this.personalAccessTokens = personalAccessTokens.map((token) => { return { ...token, scope: this.convertTokenScope(token.scope), expiresAt: this.convertTokenDate(token.expiresAt), createdAt: this.convertTokenDate(token.createdAt), lastUsed: this.convertTokenDate(token.lastUsed) } }) }));

  }

  private checkUserIsAuthorized() {
    if (!ConfigManager.isInit()) {
      timer(250).subscribe(() => this.checkUserIsAuthorized());
      return;
    }

    if (!ConfigManager.getIsAdmin()) {
      console.log("you shouldn't be here")
      this.router.navigate(["projects"])
    }
  }

  handleWebsocketNotification(msgParts) {
    if (msgParts[1] == 'pat') {
      let id = msgParts[2];
      let access_token_ids = this.personalAccessTokens.map((token) => token.id);
      if (access_token_ids.includes(id)) {
        this.personalAccessTokensQuery$.refetch();
      }
    }
  }

  deletePersonalAccessToken(tokenId: string) {
    this.projectApolloService
      .deletePersonalAccessTokenById(this.project.id, tokenId)
      .pipe(first()).subscribe();
  }

  createPersonalAccessToken(name: string, expiresAt: string, scope: string) {
    this.checkTokenNameIsDuplicated(name);
    if (this.tokenNameIsDuplicated == false) this.projectApolloService.createPersonalAccessToken(this.project.id, name, expiresAt, scope).pipe(first()).subscribe((token) => this.newToken = token);
  }

  copyToken() {
    this.tokenCopied = true;
    copyToClipboard(this.newToken);
    timer(1000).subscribe(() => this.tokenCopied = false);
  }

  closeTokenModal() {
    this.newToken = null;
    this.tokenNameIsDuplicated = null;
  }

  checkTokenNameIsDuplicated(name: string) {
    for (const token of this.personalAccessTokens) {
      if (token.name === name) {
        this.tokenNameIsDuplicated = true;
        return;
      }
    }
    this.tokenNameIsDuplicated = false;
  }

  convertTokenScope(scope: string) {
    if (scope == "READ") return "Read only";
    else if (scope == "READ_WRITE") return "Read and write";
    else return "Invalid";
  }

  convertTokenDate(date) {
    if (date == null) return "Never";
    return new Date(date).toDateString();
  }
}
