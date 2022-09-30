import { Component, OnDestroy, OnInit } from '@angular/core';
import { timer } from 'rxjs';
import { UserManager } from 'src/app/util/user-manager';
import { CommentDataManager } from './comment-helper';

@Component({
  selector: 'kern-comment',
  templateUrl: './comment.component.html',
  styleUrls: ['./comment.component.scss']
})
export class CommentComponent implements OnInit, OnDestroy {
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
  myUser: any;
  allUsers: any;

  newComment = {
    areaOpen: false,
    commentType: "",
    commentTypeReadable: "",
    commentId: "",
    commentIdReadable: "",
  }
  commentIdOptions: any[];
  commentTypeOptions: any[];

  constructor() { }
  ngOnDestroy(): void {
    UserManager.unregisterAfterInitAction(this);
  }
  ngOnInit(): void {
    this.initDataManger();
    UserManager.registerAfterInitAction(this, () => this.initUsers(), true);
  }

  private initUsers() {
    this.myUser = UserManager.getUser(false);
    this.allUsers = UserManager.getAllUsers(false);
  }
  initDataManger() {
    if (!CommentDataManager.isInit()) {
      timer(250).subscribe(() => this.initDataManger());
      return;
    }
    this.dm = CommentDataManager.getInstance();
  }

  openAddNewComment() {
    this.newComment.areaOpen = true;
    this.commentTypeOptions = this.dm.getCommentTypeOptions();
    if (this.commentTypeOptions.length > 0) this.switchCommentType(0);
  }

  switchCommentType(index: number) {
    if (index > this.commentTypeOptions.length) return;
    this.newComment.commentType = this.commentTypeOptions[index].key;
    this.newComment.commentTypeReadable = this.commentTypeOptions[index].name;
    this.commentIdOptions = this.dm.getCommentIdOptions(this.newComment.commentType);
  }
  switchCommentId(index: number) {
    if (index > this.commentIdOptions.length) return;
    this.newComment.commentId = this.commentIdOptions[index].id;
    this.newComment.commentIdReadable = this.commentIdOptions[index].name;
    if (!this.newComment.commentIdReadable) this.newComment.commentIdReadable = 'unknown id';

  }
  saveCommentToDb(comment: string, isPrivate: boolean) {
    console.log("tried to save", comment, isPrivate, this.newComment);
    this.dm.createComment(comment, this.newComment.commentType, this.newComment.commentId, isPrivate);
  }
}
