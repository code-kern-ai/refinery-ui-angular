import { Component, OnInit } from '@angular/core';
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

export class ProjectAdminComponent implements OnInit {

  projectName = new FormControl('');
  project$: any;
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

  ngOnInit(): void {
    this.checkUserIsAuthorized();
    this.routeService.updateActivatedRoute(this.activatedRoute);

    const projectId = this.activatedRoute.parent.snapshot.paramMap.get('projectId');
    [this.projectQuery$, this.project$] = this.projectApolloService.getProjectByIdQuery(projectId);
    this.project$.subscribe((project) => this.project = project);

    NotificationService.subscribeToNotification(this, {
      projectId: projectId,
      whitelist: [],
      func: this.handleWebsocketNotification
    });

    let preparationTasks$ = [];
    preparationTasks$.push(this.preparePersonalAccessTokensRequest(projectId));

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

  preparePersonalAccessTokensRequest(projectId: string) {
    let personalAccessTokens$;
    [this.personalAccessTokensQuery$, personalAccessTokens$] = this.projectApolloService.getAllPersonalAccessTokens(projectId);
    this.subscriptions$.push(personalAccessTokens$.subscribe((personalAccessTokens) => { this.personalAccessTokens = personalAccessTokens; console.log(this.personalAccessTokens) }));
    return personalAccessTokens$;
  }

  handleWebsocketNotification(msgParts) {
    return null
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
        console.log("Token duplicated found")
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
