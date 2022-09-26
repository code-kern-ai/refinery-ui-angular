import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'kern-logs',
  templateUrl: './logs.component.html',
  styleUrls: ['./logs.component.scss']
})
export class LogsComponent implements OnInit {

  @Input()lastTask: any;

  constructor() { }

  ngOnInit(): void {
    console.log(this.lastTask)
  }

}
