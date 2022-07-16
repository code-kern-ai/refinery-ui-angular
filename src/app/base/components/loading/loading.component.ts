import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'kern-loading',
  templateUrl: './loading.component.html',
  styleUrls: ['./loading.component.scss'],
})
export class LoadingComponent implements OnInit  {
  @Input() size: string ='btn-xs';
  @Input() color: string ='yellow';
  
  background: string;
  text: string;

  constructor() {
  }

  ngOnInit(): void {
    this.background = 'bg-'+this.color+'-100';
    this.text ='text-'+this.color+'-700';
  }

  ngOnChanges(): void {
    this.background = 'bg-'+this.color+'-100';
    this.text ='text-'+this.color+'-700';
  }
}
