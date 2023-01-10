import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'kern-record-table',
  templateUrl: './record-table.component.html',
  styleUrls: ['./record-table.component.scss']
})
export class RecordTableComponent implements OnInit {

  @Input() tableData: any[] = [];
  @Input() allData: any[] = [];

  constructor() { }

  ngOnInit(): void {
    this.tableData = this.tableData.sort((a, b) => a.order - b.order);
    if (this.tableData.findIndex((data) => data.field === 'label') > -1) {
      for (const [key, value] of Object.entries(this.allData)) {
        const color = this.allData[key].color;
        this.allData[key].backgroundColor = 'bg-' + color + '-100';
        this.allData[key].textColor = 'text-' + color + '-700';
        this.allData[key].borderColor = 'border-' + color + '-400';
      }
    }
  }
}
