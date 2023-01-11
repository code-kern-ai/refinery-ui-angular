import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'kern-record-table',
  templateUrl: './record-table.component.html',
  styleUrls: ['./record-table.component.scss']
})
export class RecordTableComponent implements OnChanges {

  @Input() columnsData: any[] | {}; // optional, if not provided, all data columns will be displayed
  @Input() tableData: any[] | {};

  preparedColumnsData: any[];
  preparedTableData: any[];

  constructor() { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.columnsData) {
      this.preparedColumnsData = this.prepareColumnsData(this.columnsData);
    }
    if (changes.tableData) {
      this.preparedTableData = this.prepareTableData(this.tableData);
      if (!this.preparedColumnsData) {
        this.preparedColumnsData = this.prepareColumnsData(this.preparedTableData);
      }
    }
  }

  prepareColumnsData(columnsData: any[] | {}): any[] {
    if (!columnsData ||
      (!Array.isArray(columnsData) && Object.keys(columnsData).length == 0) ||
      (Array.isArray(columnsData) && columnsData.length == 0)) {
      return [];
    }
    const finalArray = [];
    let defaultKeyField = 'field';
    let defaultKeyDisplayName = 'displayName';
    let defaultKeyOrder = 'order';
    const firstEl = Array.isArray(columnsData) ? columnsData[0] : Object.values(columnsData)[0];
    if (!firstEl.hasOwnProperty(defaultKeyField)) {
      defaultKeyField = this.getDefaultFieldKey(firstEl);
    }
    if (!firstEl.hasOwnProperty(defaultKeyDisplayName)) {
      defaultKeyDisplayName = this.getDefaultFieldKey(firstEl);
    }
    if (!firstEl.hasOwnProperty(defaultKeyOrder)) {
      defaultKeyDisplayName = this.getDefaultFieldKey(firstEl, false);
    }
    if (Array.isArray(columnsData)) {
      if (typeof firstEl === 'object') {
        finalArray.push(...columnsData.map(columnData => ({
          field: columnData[defaultKeyField],
          displayName: columnData[defaultKeyDisplayName],
          order: columnData[defaultKeyOrder]
        })));
      } else {
        let i = 0;
        finalArray.push(...columnsData.map(columnData => ({
          field: columnData,
          displayName: columnData,
          order: i++
        })));
      }
    } else {
      finalArray.push(...Object.keys(columnsData).map(key => ({
        field: columnsData[key][defaultKeyField],
        displayName: columnsData[key][defaultKeyDisplayName],
        order: columnsData[key][defaultKeyOrder]
      })));
    }
    finalArray.sort((a, b) => a.order - b.order);
    return finalArray;
  }

  getDefaultFieldKey(columnData: any, isString: boolean = true): string {
    if (isString) {
      if (columnData.name) return 'name';
      if (columnData.text) return 'text';

      for (const key of Object.keys(columnData)) {
        if (typeof columnData[key] == 'string') return key;
      }
    } else {
      if (columnData.order) return 'order';
      if (columnData.position) return 'position';
      if (columnData.id) return 'id';

      for (const key of Object.keys(columnData)) {
        if (typeof columnData[key] == 'number') return key;
      }
    }
    throw new Error("Cant find text in given array - record-table");
  }

  prepareTableData(tableData: any[] | {}): any[] {
    const finalArraySize = Array.isArray(tableData) ? tableData.length : Object.keys(tableData).length;
    const finalArray = Array(finalArraySize);
    if (Array.isArray(tableData)) {
      let i = 0;
      for (const element of tableData) {
        this.fillColorInfo(element);
        finalArray[i++] = element;
      }
    } else {
      let i = 0;
      for (const [key] of Object.entries(tableData)) {
        this.fillColorInfo(tableData[key]);
        finalArray[i++] = tableData[key];
      }
    }
    return finalArray;
  }

  fillColorInfo(element: any): void {
    if (!element.color) return;
    const color = element.color;
    if (!element.hasOwnProperty('backgroundColor')) {
      element.backgroundColor = 'bg-' + color + '-100';
    }
    if (!element.hasOwnProperty('textColor')) {
      element.textColor = 'text-' + color + '-700';
    }
    if (!element.hasOwnProperty('borderColor')) {
      element.borderColor = 'border-' + color + '-400';
    }
  }
}
