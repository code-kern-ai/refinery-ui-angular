import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Project } from 'aws-sdk/clients/codebuild';
import { Subscription, timer } from 'rxjs';
import { AuthApiService } from '../../services/auth-api.service';
import { ConfigManager } from '../../services/config-service';

@Component({
  selector: 'kern-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {

  @Input() organizationName: string;
  @Input() user: any;
  @Input() organizationInactive: string;
  @Input() page: string;
  @Input() project: Project;
  @Input() avatarUri: string;

  showConfigSettings: boolean = false;
  subscriptions$: Subscription[] = [];
  isDemo: boolean;

  constructor(private router: Router, private auth: AuthApiService,) { }

  ngOnInit(): void {
    this.setShowConfig();
  }
  setShowConfig() {
    if (!ConfigManager.isInit()) {
      timer(250).subscribe(() => this.setShowConfig());
      return;
    }
    this.isDemo = ConfigManager.getIsDemo() && !ConfigManager.getIsAdmin();
    this.showConfigSettings = !ConfigManager.getIsManaged();
  }

  executeOption(optionSelected: string) {
    switch (optionSelected) {
      case 'Account Settings':
        window.open('/auth/settings', '_blank');
        break;
      case 'Change config':
        this.router.navigate(['config'])
        break;
      case 'Logout':
        this.logout();
        break;
    }
  }

  logout() {
    this.subscriptions$.push(
      this.auth.getLogoutOut().subscribe((response) => {
        window.location.href = response['logout_url'];
      })
    );
  }

}
