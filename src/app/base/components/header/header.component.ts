import { Component, Input, OnDestroy, OnInit } from '@angular/core';
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
export class HeaderComponent implements OnInit, OnDestroy {

  @Input() organizationName: string;
  @Input() user: any;
  @Input() organizationInactive: string;
  @Input() page: string;
  @Input() project: Project;
  @Input() avatarUri: string;
  subscriptions$: Subscription[] = [];

  showConfigSettings: boolean = false;
  isDemo: boolean;

  constructor(private auth: AuthApiService,
    private router: Router) { }

  ngOnInit(): void {
    this.setShowConfig();
  }
  setShowConfig() {
    if (!ConfigManager.isInit()) {
      timer(250).subscribe(() => this.setShowConfig());
      return;
    }
    this.isDemo = ConfigManager.getIsDemo();
    this.showConfigSettings = !ConfigManager.getIsManaged();
  }

  ngOnDestroy(): void {
    this.subscriptions$.forEach((subscription) => subscription.unsubscribe());
  }

  toggleVisible(isVisible: boolean, menuButton: HTMLDivElement): void {
    if (isVisible) {
      menuButton.classList.remove('hidden');
      menuButton.classList.add('block');
      menuButton.classList.add('z-10');
    } else {
      menuButton.classList.remove('z-10');
      menuButton.classList.remove('block');
      menuButton.classList.add('hidden');
    }
  }

  logout() {
    this.subscriptions$.push(
      this.auth.getLogoutOut().subscribe((response) => {
        window.location.href = response['logout_url'];
      })
    );
  }

  settings() {
    window.open('/auth/settings', '_blank');
  }
  changeConfig() {
    this.router.navigate(['config'])
  }
}
