import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RouteService } from 'src/app/base/services/route.service';
import { ConfigApolloService } from 'src/app/base/services/config/config-apollo.service';
import { ConfigManager } from 'src/app/base/services/config-service';
import { timer } from 'rxjs';
import { first } from 'rxjs/operators';
import { OrganizationApolloService } from 'src/app/base/services/organization/organization-apollo.service';
import { ProjectApolloService } from 'src/app/base/services/project/project-apollo.service';
import { UserManager } from 'src/app/util/user-manager';
import { getUserAvatarUri } from 'src/app/util/helper-functions';
import { snakeCaseToCamelCase } from 'submodules/javascript-functions/case-types-parser';

@Component({
  selector: 'kern-config',
  templateUrl: './config.component.html',
  styleUrls: ['./config.component.scss'],
})
export class ConfigComponent implements OnInit, OnDestroy {
  constructor(
    private activatedRoute: ActivatedRoute,
    private routeService: RouteService,
    private configApolloService: ConfigApolloService,
    private organizationApolloService: OrganizationApolloService,
    private projectApolloService: ProjectApolloService,
    private router: Router
  ) { }
  user$: any;
  avatarUri: string;
  tokenizerOptions: any[];
  organization: any;

  localConfigCopy: any;
  ngOnDestroy(): void {
    ConfigManager.unregisterUpdateAction(this);
  }

  ngOnInit(): void {
    UserManager.checkUserAndRedirect(this);
    this.routeService.updateActivatedRoute(this.activatedRoute);
    this.initComponent();
    this.organizationApolloService.getUserInfo().pipe(first())
      .subscribe((user) => {
        this.avatarUri = getUserAvatarUri(user);
      });
    this.projectApolloService
      .getAllTokenizerOptions()
      .pipe(first())
      .subscribe((v) => this.tokenizerOptions = v);
    this.organizationApolloService
      .getUserOrganization()
      .pipe(first()).subscribe((org: any) => {
        this.organization = org;
      });
  }

  private initComponent() {
    if (!ConfigManager.isInit()) {
      timer(250).subscribe(() => this.initComponent());
      return;
    }

    if (ConfigManager.getIsManaged()) {
      console.log("you shouldn't be here")
      this.router.navigate(["projects"])
    }
    ConfigManager.registerUpdateAction(this, this.updateConfigValues);
    this.updateConfigValues();
  }

  private updateConfigValues() {
    this.localConfigCopy = {
      allowDataTracking: ConfigManager.getConfigValue("allow_data_tracking"),
      limitChecks: ConfigManager.getConfigValue("limit_checks"),
      spacyDownloads: Array.from(ConfigManager.getConfigValue("spacy_downloads")),
    }
  }
  checkAndSaveValue(value: any, key: string, subkey: string = null) {
    if (key == "limit_checks") {
      if (Number(value) == this.organization[snakeCaseToCamelCase(subkey)]) return;
    } else if (ConfigManager.getConfigValue(key, subkey) == value) return;

    const updateDict: any = {};
    if (subkey) {
      updateDict[key] = {};
      if (key == "limit_checks") updateDict[key][subkey] = Number(value);
      else updateDict[key][subkey] = value;
    } else {
      updateDict[key] = value;
    }

    localStorage.removeItem("base_config");
    if (subkey == 'max_rows' || subkey == 'max_cols' || subkey == 'max_char_count') {
      this.organizationApolloService.changeOrganization(this.organization.id, JSON.stringify(updateDict.limit_checks)).pipe(first()).subscribe((o: any) => {
        if (!o?.data?.changeOrganization) {
          window.alert('something went wrong with the update');
        }
      });
    } else {
      this.configApolloService.updateConfig(JSON.stringify(updateDict)).pipe(first()).subscribe((o: any) => {
        if (!o?.data?.updateConfig) {
          window.alert('something went wrong with the update');
        }
      });
    }
  }

  getFirstName(userName) {
    this.user$ = userName;
  }

  removeSpacyTokenizer(valueToRemove: string) {
    this.localConfigCopy.spacyDownloads = this.localConfigCopy.spacyDownloads.filter(i => i != valueToRemove);
    this.checkAndSaveValue(this.localConfigCopy.spacyDownloads, "spacy_downloads");

  }

  changeConfigString(value: string, index: number) {
    this.localConfigCopy.spacyDownloads[index] = value;
    this.checkAndSaveValue(this.localConfigCopy.spacyDownloads, "spacy_downloads");
  }
  addSpacyConfig() {
    const existingConfigs = this.localConfigCopy.spacyDownloads;
    for (const o of this.tokenizerOptions) {
      if (!existingConfigs.includes(o.configString)) {
        existingConfigs.push(o.configString);
        this.checkAndSaveValue(existingConfigs, "spacy_downloads");
        break;
      }
    }
  }
}
