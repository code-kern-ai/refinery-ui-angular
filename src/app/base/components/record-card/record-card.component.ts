import { Component, Input } from '@angular/core';
import { labelingLinkType } from 'src/app/labeling/components/helper/labeling-helper';
import { RecordCardOptions } from './record-card-helper';
import { Attribute, DataBrowserRecord } from './record-card.types';


@Component({
  selector: 'kern-record-card',
  templateUrl: './record-card.component.html',
  styleUrls: ['./record-card.component.scss']
})
export class RecordCardComponent {

  @Input() record: DataBrowserRecord;
  @Input() attributes: Attribute;
  @Input() recordCardOptions: RecordCardOptions;

  constructor() {
  }

  storePreliminaryRecordIds(index: number) {
    const huddleData = {
      recordIds: this.recordCardOptions.recordList.map((record) => record.id),
      partial: true,
      linkData: {
        projectId: this.record.project_id,
        id: this.recordCardOptions.sessionId,
        requestedPos: index,
        linkType: labelingLinkType.SESSION
      },
      allowedTask: null,
      canEdit: true,
      checkedAt: { db: null, local: new Date() }

    }
    localStorage.setItem('huddleData', JSON.stringify(huddleData));
  }

  requestSimilarSearch() {
    const saveSimilaritySearch = this.recordCardOptions.dataBrowserModals.similaritySearch;
    this.recordCardOptions.similarSearchHelper.requestSimilarSearch(saveSimilaritySearch.embeddingId, saveSimilaritySearch.recordId);
  }

  setEmbeddingIdSimilaritySearch(selectedIndex: string) {
    this.recordCardOptions.dataBrowserModals.similaritySearch.embeddingId = this.recordCardOptions.similarSearchHelper.embeddings[selectedIndex].id;
  }
}
