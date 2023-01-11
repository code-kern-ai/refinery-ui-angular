import { Component, Input } from '@angular/core';
import { labelingLinkType } from 'src/app/labeling/components/helper/labeling-helper';
import { RecordCardOptions } from './record-card-helper';
import { Attributes, DataBrowserRecord } from './record-card.types';


@Component({
  selector: 'kern-record-card',
  templateUrl: './record-card.component.html',
  styleUrls: ['./record-card.component.scss']
})
export class RecordCardComponent {

  @Input() record: DataBrowserRecord;
  @Input() attributes: Attributes;
  @Input() recordCardOptions: RecordCardOptions;

  columnsData: any[] = [];

  constructor() {
  }

  ngOnInit(): void {
    this.columnsData = this.prepareColumnsData();
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

  prepareColumnsData() {
    const columnsData = [];
    columnsData.push({
      field: 'type',
      displayName: 'Type',
      order: 1
    });
    columnsData.push({
      field: 'task',
      displayName: 'Task',
      order: 2
    });
    columnsData.push({
      field: 'label',
      displayName: 'Label',
      order: 3,
    });
    columnsData.push({
      field: 'amount',
      displayName: 'Amount',
      order: 4
    });
    columnsData.push({
      field: 'confidenceAvg',
      displayName: 'Avg.confidence',
      order: 5
    });
    return columnsData;
  }
}
