import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { ProjectApolloService } from 'src/app/base/services/project/project-apollo.service';
import { Project } from 'src/app/base/entities/project';
import { first } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { NotificationService } from 'src/app/base/services/notification.service';

@Component({
  selector: 'kern-gates-integrator',
  templateUrl: './gates-integrator.component.html',
  styleUrls: ['./gates-integrator.component.scss']
})
export class GatesIntegratorComponent implements OnInit, OnDestroy {

  @Input() project: Project;
  
  gatesIntegrationData: any;
  gatesIntegrationDataQuery$: any;
  subscriptions$: Subscription[] = [];
  constructor(private projectApolloService: ProjectApolloService) { }

  ngOnInit(): void {
    this.prepareGatesIntegrationData(this.project.id);
    NotificationService.subscribeToNotification(this, {
      projectId: this.project.id,
      whitelist: this.getWhiteListNotificationService(),
      func: this.handleWebsocketNotification
    });
  }

  ngOnDestroy() {
    this.subscriptions$.forEach(subscription => subscription.unsubscribe());
    NotificationService.unsubscribeFromNotification(this);
  }

  prepareGatesIntegrationData(projectId: string) {
    let vc$;
    [this.gatesIntegrationDataQuery$, vc$] = this.projectApolloService.getGatesIntegrationData(projectId);
    this.subscriptions$.push(
      vc$.subscribe((gatesIntegrationData) => {
        this.gatesIntegrationData = gatesIntegrationData;
      }));
  }

  updateProjectForGates() {
    this.projectApolloService.updateProjectForGates(this.project.id).pipe(first()).subscribe();
  }

  getWhiteListNotificationService(): string[] {
    let toReturn = ['gates_integration', 'tokenization', 'embedding', 'embedding_deleted'];
    toReturn.push(...['information_source_deleted', 'information_source_updated']);
    return toReturn;
  }

  handleWebsocketNotification(msgParts) {
    if(msgParts[1] == 'gates_integration'){
      this.gatesIntegrationDataQuery$.refetch();
    } else if (['information_source_deleted', 'information_source_updated'].includes(msgParts[1])){
      if (this.gatesIntegrationData?.missingInformationSources?.includes(msgParts[2])) {
        this.gatesIntegrationDataQuery$.refetch();
      }
    } else if (msgParts[1] == 'tokenization' && msgParts[2] == 'docbin' && msgParts[3] == 'state' && msgParts[4] == 'FINISHED') {
      this.gatesIntegrationDataQuery$.refetch();
    } else if (msgParts[1] == 'embedding' && msgParts[3] == 'state' && msgParts[4] == 'FINISHED') {
      if (this.gatesIntegrationData?.missingEmbeddings?.includes(msgParts[2])) {
        this.gatesIntegrationDataQuery$.refetch();
      }
    } else if (msgParts[1] == 'embedding_deleted') {
      if (this.gatesIntegrationData?.missingEmbeddings?.includes(msgParts[2])) {
        this.gatesIntegrationDataQuery$.refetch();
      }
    }
  }
}
