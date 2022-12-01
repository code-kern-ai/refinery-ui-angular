import { Component, ElementRef, OnDestroy, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { KnowledgeBasesApolloService } from 'src/app/base/services/knowledge-bases/knowledge-bases-apollo.service';
import { RouteService } from 'src/app/base/services/route.service';
import { first, switchMap } from 'rxjs/operators';
import { NotificationService } from 'src/app/base/services/notification.service';
import { Subscription } from 'rxjs';
import { UserManager } from 'src/app/util/user-manager';
import { CommentDataManager, CommentType } from 'src/app/base/components/comment/comment-helper';
import { createDefaultLookuplistsModals, LookuplistsModals } from './knowlegde-bases-helper';

@Component({
  selector: 'kern-knowledge-bases',
  templateUrl: './knowledge-bases.component.html',
  styleUrls: ['./knowledge-bases.component.scss'],
})
export class KnowledgeBasesComponent implements OnInit, OnDestroy {
  knowledgeBases$: any;
  knowledgeBasesQuery$: any;
  projectId: string;
  lists: any[] = [];
  @ViewChildren("checkboxes") checkboxes: QueryList<ElementRef>;
  subscriptions$: Subscription[] = [];
  lookuplistsModals: LookuplistsModals = createDefaultLookuplistsModals();

  constructor(
    private activatedRoute: ActivatedRoute,
    private routeService: RouteService,
    private knowledgeBaseApollo: KnowledgeBasesApolloService,
    private router: Router
  ) { }

  ngOnDestroy(): void {
    this.subscriptions$.forEach((subscription) => subscription.unsubscribe());
    NotificationService.unsubscribeFromNotification(this, this.projectId);
    CommentDataManager.unregisterAllCommentRequests(this);
  }

  ngOnInit(): void {
    UserManager.checkUserAndRedirect(this);
    this.routeService.updateActivatedRoute(this.activatedRoute);

    this.projectId = this.activatedRoute.parent.snapshot.paramMap.get('projectId');
    [this.knowledgeBasesQuery$, this.knowledgeBases$] = this.knowledgeBaseApollo.getKnowledgeBasesByProjectId(this.projectId);
    NotificationService.subscribeToNotification(this, {
      projectId: this.projectId,
      whitelist: ['knowledge_base_updated', 'knowledge_base_deleted', 'knowledge_base_created'],
      func: this.handleWebsocketNotification
    });
    this.subscriptions$.push(this.knowledgeBases$.subscribe(lists => this.lists = lists));
    this.setUpCommentRequests(this.projectId);
  }
  private setUpCommentRequests(projectId: string) {
    const requests = [];
    requests.push({ commentType: CommentType.KNOWLEDGE_BASE, projectId: projectId });
    CommentDataManager.registerCommentRequests(this, requests);
  }
  createKnowledgeBase(project_id) {
    this.knowledgeBaseApollo.createKnowledgeBase(project_id).pipe(first()).subscribe((result: any) => {
      const id = result?.data?.createKnowledgeBase.knowledgeBase.id;
      if (id) {
        this.router.navigate([id], {
          relativeTo: this.activatedRoute,
        });
      }
    });

  }

  deleteKnowledgeBase(project_id, knowledge_base_id) {
    this.knowledgeBaseApollo
      .deleteKnowledgeBase(project_id, knowledge_base_id)
      .pipe(first())
      .subscribe();
    this.lookuplistsModals.deleteSelected.selectedLookupLists = [];
  }

  handleWebsocketNotification(msgParts) {
    if (['knowledge_base_updated', 'knowledge_base_deleted', 'knowledge_base_created'].includes(msgParts[1])) {
      this.knowledgeBasesQuery$.refetch();
    }
  }

  deleteSelectedLookupLists() {
    this.lookuplistsModals.deleteSelected.selectedLookupLists.forEach(el => {
      this.deleteKnowledgeBase(this.projectId, el.id);
    })
  }

  prepareSelectionList() {
    this.lookuplistsModals.deleteSelected.open = true;
    this.lookuplistsModals.deleteSelected.selectionList = "";
    this.lookuplistsModals.deleteSelected.selectedLookupLists.forEach(el => {
      if (this.lookuplistsModals.deleteSelected.selectionList) this.lookuplistsModals.deleteSelected.selectionList += "\n";
      this.lookuplistsModals.deleteSelected.selectionList += el.name;
    })

  }

  toggleCheckbox(base) {
    if (this.lookuplistsModals.deleteSelected.selectedLookupLists.includes(base)) {
      this.lookuplistsModals.deleteSelected.selectedLookupLists = this.lookuplistsModals.deleteSelected.selectedLookupLists.filter((x) => x.id != base.id);
    } else {
      this.lookuplistsModals.deleteSelected.selectedLookupLists.push(base);
    }
  }

  executeOption(value: string) {
    switch (value) {
      case 'Select all':
        this.setAllLookupLists(true);
        break;
      case 'Deselect all':
        this.setAllLookupLists(false);
        break;
      case 'Delete selected':
        this.prepareSelectionList();
        break;
    }
  }

  setAllLookupLists(value) {
    this.checkboxes.forEach((element) => {
      element.nativeElement.checked = value;
    });
    this.lists.forEach(list => {
      if (value) {
        if (this.lookuplistsModals.deleteSelected.selectedLookupLists.includes(list)) return;
        else this.lookuplistsModals.deleteSelected.selectedLookupLists.push(list);
      }
      else this.lookuplistsModals.deleteSelected.selectedLookupLists = [];
    })
  }
}
