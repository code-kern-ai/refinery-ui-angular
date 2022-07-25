import { Component, Input, OnInit } from '@angular/core';
import { Project } from 'aws-sdk/clients/codebuild';
import { timer } from 'rxjs';
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

  constructor() { }

  ngOnInit(): void {
    this.setShowConfig();
  }
  setShowConfig() {
    if (!ConfigManager.isInit()) {
      timer(250).subscribe(() => this.setShowConfig());
      return;
    }
    this.showConfigSettings = !ConfigManager.getIsManaged()
  }

}
