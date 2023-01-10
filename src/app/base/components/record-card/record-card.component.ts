import { Component, Input } from '@angular/core';
import { DataBrowserModals, RecordCommentsModal } from 'src/app/data/components/data-browser/helper-classes/modals-helper';
import { labelingLinkType } from 'src/app/labeling/components/helper/labeling-helper';
import { AttributeSort, DataBrowserRecord, ExtendedRecord } from './record-card.types';


@Component({
  selector: 'kern-record-card',
  templateUrl: './record-card.component.html',
  styleUrls: ['./record-card.component.scss']
})
export class RecordCardComponent {

  @Input() record: DataBrowserRecord;
  @Input() attributesSortOrder: AttributeSort;
  @Input() index: number;
  @Input() extendedRecords: ExtendedRecord;
  @Input() similarSearchHelper: any;
  @Input() recordComments: RecordCommentsModal;
  @Input() attributes: Map<string, any>;
  @Input() dataBrowserModals: DataBrowserModals;
  @Input() activeSearchParams: any;

  constructor() { }
  ngOnInit() {
    console.log(this.record)
  }

  storePreliminaryRecordIds(index: number) {
    const huddleData = {
      recordIds: this.extendedRecords.recordList.map((record) => record.id),
      partial: true,
      linkData: {
        projectId: this.record.project_id,
        id: this.extendedRecords.sessionId,
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
    const saveSimilaritySearch = this.dataBrowserModals.similaritySearch;
    this.similarSearchHelper.requestSimilarSearch(saveSimilaritySearch.embeddingId, saveSimilaritySearch.recordId);
  }

  setEmbeddingIdSimilaritySearch(selectedIndex: string) {
    this.dataBrowserModals.similaritySearch.embeddingId = this.similarSearchHelper.embeddings[selectedIndex].id;
  }
}
