import { Component, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { timer } from 'rxjs';
import { first } from 'rxjs/operators';
import { ConfigManager } from 'src/app/base/services/config-service';
import { OrganizationApolloService } from 'src/app/base/services/organization/organization-apollo.service';
import { getUserAvatarUri } from 'src/app/util/helper-functions';
import { UserManager } from 'src/app/util/user-manager';

@Component({
  selector: 'kern-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss'],
})
export class UsersComponent implements OnInit, OnDestroy {
  organizationName: string;
  organizationInactive: boolean;
  user$: any;
  avatarUri: string;
  isManaged: boolean = true;
  static youtubeUrl: string = "https://www.youtube.com/embed/Hwlu6GWzDH8?autoplay=1&enablejsapi=1";
  saveUrl: SafeResourceUrl;

  engineers: any[];
  experts: any[];
  annotators: any[];


  constructor(
    private organizationApolloService: OrganizationApolloService,
    private urlSanatizer: DomSanitizer
  ) { }


  ngOnDestroy(): void {
  }


  ngOnInit(): void {
    UserManager.checkUserAndRedirect(this);
    this.organizationApolloService
      .getUserOrganization()
      .pipe(first()).subscribe((org) => {
        this.organizationInactive = org == null;
        if (!this.organizationInactive) {
          this.organizationName = org.name;
          this.organizationApolloService.getOrganizationUsers().pipe(first()).subscribe((users) => this.moveAnnotatorsToArr(users));
        }

      });



    this.organizationApolloService.getUserInfo().pipe(first())
      .subscribe((user) => this.avatarUri = getUserAvatarUri(user));
    this.checkIfDemoUser();
  }

  private moveAnnotatorsToArr(users: any[]) {
    users.forEach(user => user.avatarUri = getUserAvatarUri(user));
    this.engineers = users.filter(u => u.role == "ENGINEER");
    this.experts = users.filter(u => u.role == "EXPERT");
    this.annotators = users.filter(u => u.role == "ANNOTATOR");

  }




  startPlayback() {
    this.saveUrl = this.urlSanatizer.bypassSecurityTrustResourceUrl(UsersComponent.youtubeUrl);
  }

  checkIfDemoUser() {
    if (!ConfigManager.isInit()) {
      timer(250).subscribe(() => this.checkIfDemoUser());
      return;
    }
    this.isManaged = ConfigManager.getIsManaged();
  }

  getFirstName(userName) {
    this.user$ = userName;
  }

}
