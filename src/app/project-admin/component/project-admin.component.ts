import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, timer } from 'rxjs';
import { first } from 'rxjs/operators';
import { NotificationService } from 'src/app/base/services/notification.service';
import { ProjectApolloService } from 'src/app/base/services/project/project-apollo.service';
import { RouteService } from 'src/app/base/services/route.service';
import { copyToClipboard } from 'src/app/util/helper-functions';
import { ConfigManager } from 'src/app/base/services/config-service';
import { dateAsUTCDate } from 'submodules/javascript-functions/date-parser';

@Component({
  selector: 'project-admin-admin',
  templateUrl: './project-admin.component.html',
  styleUrls: ['./project-admin.component.scss']
})

export class ProjectAdminComponent implements OnInit, OnDestroy {

  projectName = new FormControl('');
  projectId: any;
  personalAccessTokens: any;
  personalAccessTokensQuery$: any;
  newToken: string;
  tokenCopied: boolean = false;
  tokenNameIsDuplicated: boolean;
  subscriptions$: Subscription[] = [];


  modals = {
    deleteTokenOpen: false,
    deleteTokenContainerId: null,
    createTokenOpen: false,
  }

  constructor(
    private routeService: RouteService,
    private activatedRoute: ActivatedRoute,
    private projectApolloService: ProjectApolloService,
    private router: Router
  ) { }


  ngOnDestroy(): void {
    this.subscriptions$.forEach((subscription) => subscription.unsubscribe());
    NotificationService.unsubscribeFromNotification(this, this.projectId);
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
    this.subscriptions$.push(personalAccessTokens$.subscribe((personalAccessTokens) => {
      this.personalAccessTokens = personalAccessTokens.map((token) => {
        return { ...token, scope: this.convertTokenScope(token.scope), expiresAt: this.convertTokenDate(token.expiresAt), createdAt: this.convertTokenDate(token.createdAt), lastUsed: this.convertTokenDate(token.lastUsed) }
      })
    }));

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
      if (!this.personalAccessTokens) return; // to ensure the program doesn't crash if the data wasn't loaded yet but the websocket already tells us to refetch
      const id = msgParts[2];
      if (this.personalAccessTokens.find(p => p.id == id)) {
        this.personalAccessTokensQuery$.refetch();
      }
    }
  }

  deletePersonalAccessToken() {
    if (!this.modals.deleteTokenContainerId) return;
    this.projectApolloService
      .deletePersonalAccessTokenById(this.projectId, this.modals.deleteTokenContainerId)
      .pipe(first()).subscribe();
  }

  createPersonalAccessToken(name: string, expiresAt: string, scope: string) {
    if (!this.isTokenNameDuplicated(name)) this.projectApolloService.createPersonalAccessToken(this.projectId, name, expiresAt, scope).pipe(first()).subscribe((token) => this.newToken = token);
  }

  copyToken() {
    this.tokenCopied = true;
    copyToClipboard(this.newToken);
    timer(1000).subscribe(() => this.tokenCopied = false);
  }

  closeTokenModal() {
    this.newToken = null;
    this.modals.createTokenOpen = false;
    this.tokenNameIsDuplicated = null;
  }

  isTokenNameDuplicated(name: string): boolean {
    return this.personalAccessTokens.some((token) => token.name === name);
  }

  convertTokenScope(scope: string): string {
    if (scope == "READ") return "Read only";
    else if (scope == "READ_WRITE") return "Read and write";
    else return "Invalid";
  }

  convertTokenDate(date: string): string {
    if (date == null) return "Never";
    return dateAsUTCDate(new Date(date)).toLocaleDateString();
  }
}
