import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { DataBrowserModals, RecordCommentsModal } from 'src/app/data/components/data-browser/helper-classes/modals-helper';


@Component({
  selector: 'kern-record-card',
  templateUrl: './record-card.component.html',
  styleUrls: ['./record-card.component.scss']
})
export class RecordCardComponent implements OnInit {

  @Input() record: Record;
  @Input() attributesSortOrder: AttributeSort;
  @Input() index: number;
  @Input() extendedRecords: ExtendedRecord;
  @Input() similarSearchHelper: any;
  @Input() recordComments: RecordCommentsModal;
  @Input() attributes: Map<string, any>;
  @Input() dataBrowserModals: DataBrowserModals;
  @Input() activeSearchParams: any;

  @Output() preliminaryRecordIds = new EventEmitter<number>();

  constructor() { }

  ngOnInit(): void {
  }

  storePreliminaryRecordIds(index: number) {
    this.preliminaryRecordIds.emit(index);
  }

  requestSimilarSearch() {
    const saveSimilaritySearch = this.dataBrowserModals.similaritySearch;
    this.similarSearchHelper.requestSimilarSearch(saveSimilaritySearch.embeddingId, saveSimilaritySearch.recordId);
  }

  setEmbeddingIdSS(selectedValue: string) {
    this.dataBrowserModals.similaritySearch.embeddingId = this.similarSearchHelper.embeddings[selectedValue].id;
  }
}

export type Record = {
  category: string;
  created_at: string;
  data: any;
  db_order: number;
  id: string;
  project_id: string;
  record_id: string;
  rla_aggregation: any;
  rla_data: any;
  wsHint: string;
};

export type AttributeSort = {
  key: string;
  name: string;
  order: number;
  type: string;
};

export type ExtendedRecord = {
  fullCount: number;
  queryLimit: number;
  queryOffset: number;
  recordList: Record[];
  sessionId: string;
  sql: string;
};