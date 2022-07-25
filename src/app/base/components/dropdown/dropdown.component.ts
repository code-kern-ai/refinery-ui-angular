import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { first } from 'rxjs/operators';
import { InformationSourceType } from '../../enum/graphql-enums';
import { AuthApiService } from '../../services/auth-api.service';
import { ProjectApolloService } from '../../services/project/project-apollo.service';
import { Project } from 'src/app/base/entities/project';

@Component({
  selector: 'kern-dropdown',
  templateUrl: './dropdown.component.html',
  styleUrls: ['./dropdown.component.scss']
})
export class DropdownComponent implements OnInit, OnDestroy {

  @Input() element: string;
  @Input() avatarUri: string;
  @Input() showConfigSettings: boolean;
  @Input() buttonName: string;
  @Input() buttonTooltip: string;
  @Input() selectedItems: any[] = [];
  @Input() isHeuristics: boolean;
  @Input() isButtonWhite = true;

  @Output() setAllItems = new EventEmitter<boolean>();
  @Output() runSelectedItems = new EventEmitter<boolean>();
  @Output() sendSelectedItems = new EventEmitter<any>();
  @Output() editTerm = new EventEmitter<boolean>();
  @Output() removeTerm = new EventEmitter<boolean>();
  @Output() blackListTerm = new EventEmitter<boolean>();

  optionSettings = { 
    action: () => window.open('/auth/settings', '_blank'),
    optionName: 'Account settings' 
  };
  optionConf = { 
    action: () => this.router.navigate(['config']),
    optionName: 'Change config' 
  };
  optionLogout = { 
    action: () => this.logout(),
    optionName: 'Logout' 
  };
  optionSelectAll = {
    action: () => this.setAllItems.emit(true),
    optionName: 'Select all',
    hasIcon: true,
    iconName: 'select-all'
  };
  optionDeselectAll = {
    action: () => this.setAllItems.emit(false),
    optionName: 'Deselect all',
    hasIcon: true,
    iconName: 'deselect-all'
  };
  optionRunSelected = {
    action: () => this.runSelectedItems.emit(true),
    optionName: 'Run selected',
    hasIcon: true,
    iconName: 'run'
  };
  optionEditTerm = {
    action:() => this.editTerm.emit(true),
    optionName: 'Edit term',
    hasIcon: true,
    iconName: 'edit-term'
  };
  optionRemoveTerm = {
    action:() => this.removeTerm.emit(true),
    optionName: 'Remove term',
    hasIcon: true,
    iconName: 'remove-term'
  };
  optionWhiteListTerm = {
    action:() => this.blackListTerm.emit(true),
    optionName: 'Whitelist term',
    hasIcon: true,
    iconName: 'whitelist-term'
  };
  optionBlackListTerm = {
    action:() => this.blackListTerm.emit(true),
    optionName: 'Blacklist term',
    hasIcon: true,
    iconName: 'blacklist-term'
  };
  optionLabelingFunction = {
    optionName: 'Labeling function',
    forLabel: 'heuristics-' + InformationSourceType.LABELING_FUNCTION,
    hasIcon: true,
    iconName: 'labeling-function'
  };
  optionActiveLearning = {
    optionName: 'Active learning',
    forLabel: 'heuristics-'+InformationSourceType.ACTIVE_LEARNING,
    hasIcon: true,
    iconName: 'active-learning'
  };
  optionZeroShot = {
    optionName: 'Zero-shot',
    forLabel: 'zero-shot-modal',
    hasIcon: true,
    iconName: 'zero-shot'
  };
  optionClickbait = {
    optionName: 'Clickbait',
    hasIcon: true,
    iconName: 'clickbait',
    description: 'Binary classification for detecting nudging articles.'
  };
  optionClickbaitInitial = {
    optionName: 'Clickbait - initial',
    description: 'Initial (only contains the initial data set and labels.)'
  };
  optionConversationalAi = {
    optionName: 'Conversational AI',
    hasIcon: true,
    iconName: 'conversational-ai',
    description: 'Detecting intent within conversational lines.'
  };
  optionConversationalAiInitial = {
    optionName: 'Conversational AI - initial',
    description: 'Initial (only contains the initial data set and labels.)'
  };
  optionAgNews = {
    optionName: 'AG News',
    hasIcon: true,
    iconName: 'ag-news',
    description: 'Modelling topics of headline news.'
  };
  optionAgNewsInitial = {
    optionName: 'AG News - initial',
    description: 'Initial (only contains the initial data set and labels.)'
  };

  subscriptions$: Subscription[] = [];

  constructor(
      private auth: AuthApiService,
      private router: Router,
      private projectApolloService: ProjectApolloService) { }

  ngOnInit(): void {
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

  prepareSelectionList() {
    this.sendSelectedItems.emit(this.selectedItems);
  }

  importSampleProject(projectName) {
    this.projectApolloService.createSampleProject(projectName).pipe(first()).subscribe((p: Project) => {
      if (this.router.url == "/projects") {
        this.router.navigate(['projects', p.id, 'overview']);
      }
    });
  }
}
