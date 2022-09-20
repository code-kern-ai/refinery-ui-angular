import { Component, OnInit } from '@angular/core';
import { UserManager } from 'src/app/util/user-manager';

@Component({
  selector: 'kern-model-download',
  templateUrl: './model-download.component.html',
  styleUrls: ['./model-download.component.scss']
})
export class ModelDownloadComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
    UserManager.checkUserAndRedirect(this);
  }

}
