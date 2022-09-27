import { timer } from "rxjs";
import { first } from "rxjs/operators";
import { ProjectApolloService } from "src/app/base/services/project/project-apollo.service";
import { RecordApolloService } from "src/app/base/services/record/record-apollo.service";
import { DataBrowserComponent } from "../data-browser.component";

export class SimilarSearch {

  private dataBrowser: DataBrowserComponent;
  private recordApolloService: RecordApolloService;
  private projectApolloService: ProjectApolloService;

  public embeddings: any;
  public rememberedRecordId: any;
  public recordsRequested: boolean = false;
  public recordsInDisplay: boolean = false;

  constructor(dataBrowser: DataBrowserComponent, recordApolloService: RecordApolloService, projectApolloService: ProjectApolloService) {
    this.dataBrowser = dataBrowser;
    this.recordApolloService = recordApolloService;
    this.projectApolloService = projectApolloService;
  }

  getWebsocketWhitelist(): string[] {
    return ['embedding', 'embedding_deleted'];
  }

  handleWebsocketNotification(msgParts: string[]) {
    if (msgParts[1] == 'embedding' && msgParts[3] == "state" && msgParts[4] == "FINISHED") {
      this.refreshEmbeddings();
    } else if (msgParts[1] == 'embedding_deleted') {
      if (!this.embeddings) return;
      this.embeddings = this.embeddings.filter(e => e.id != msgParts[2]);
    }
  }

  refreshEmbeddings() {
    const projectId = this.dataBrowser.projectId;
    let q$, vc$;
    [q$, vc$] = this.projectApolloService.getEmbeddingSchema(projectId);
    vc$.pipe(first()).subscribe((embeddings) => this.embeddings = embeddings.filter((e) => e.state == "FINISHED" && e.type == "ON_ATTRIBUTE"));
  }

  requestSimilarSearch(embeddingId: string, recordId: string) {
    if (!this.embeddings || this.embeddings.length == 0) {
      console.log("no embeddings known");
      return;
    }
    this.recordsRequested = true;
    this.dataBrowser.clearFilters();
    this.setRecordsHelper(true);
    if (!embeddingId) embeddingId = this.embeddings[0].id

    this.dataBrowser.currentSearchRequest = {
      callerName: "requestSimilarSearch",
      variables: {
        projectId: this.dataBrowser.projectId,
        embeddingId: embeddingId,
        recordId: recordId,
      },

      func: this.recordApolloService.getSimilarRecords
    }

    this.dataBrowser.requestCurrentBatch(false, null, () => { timer(1000).subscribe(() => this.recordsRequested = false); }, this);

    this.dataBrowser.refreshHighlightModule();
  }

  setRecordsHelper(value: boolean) {
    this.recordsRequested = value;
    this.recordsInDisplay = value;
  }

  requestOutlierSlice(embeddingId: string) {
    if (!this.embeddings || this.embeddings.length == 0) {
      console.log("no embeddings known");
      return;
    }
    if (!embeddingId) embeddingId = this.embeddings[0].id
    this.projectApolloService.createOutlierSlice(this.dataBrowser.projectId, embeddingId).pipe(first()).subscribe(() => {
      this.dataBrowser.dataSlicesQuery$.refetch();
    });
  }
}
