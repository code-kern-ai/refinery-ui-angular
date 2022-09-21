import { Component, OnInit } from '@angular/core';
import { timer } from 'rxjs';
import { UserManager } from 'src/app/util/user-manager';
import { CommentDataManager } from './comment-helper';

@Component({
  selector: 'kern-comment',
  templateUrl: './comment.component.html',
  styleUrls: ['./comment.component.scss']
})
export class CommentComponent implements OnInit {
  //TODO work in progress not yet useable
  dm: CommentDataManager;
  cData = {
    comment: "test",
    created_at: "2022-09-21T15:34:27",
    created_by: "e1d5b42c-4ddf-472c-84bb-9685d784edbb",
    creationUser: "Jens",
    id: "8e7fa62e-bc17-41d7-b62c-1923517db588",
    is_markdown: false,
    is_private: false,
    order_key: 1,
    project_id: "8e7fa62e-bc17-41d7-b62c-1923517db589",
    xfkey: "e63002ae-491a-42f3-ab26-79eb2f8948e2",
    xfkeyAdd: { name: "Task abc" },
    xftype: "LABELING_TASK",
    open: true,
    edit: false,
  }
  user: any;
  constructor() { }
  ngOnInit(): void {
    this.initDataManger();
  }

  initDataManger() {
    if (!CommentDataManager.isInit()) {
      timer(250).subscribe(() => this.initDataManger());
      return;
    }
    this.dm = CommentDataManager.getInstance();
    this.user = UserManager.getUser(true);
  }
}
