import { Component, OnDestroy, OnInit } from '@angular/core';
import { interval, timer } from 'rxjs';
import { UserManager } from 'src/app/util/user-manager';
import { CommentDataManager } from './comment-helper';

@Component({
  selector: 'kern-comment',
  templateUrl: './comment.component.html',
  styleUrls: ['./comment.component.scss']
})
export class CommentComponent implements OnInit, OnDestroy {
  dm: CommentDataManager;
  // cData = {
  //   comment: "test",
  //   created_at: "2022-09-21T15:34:27",
  //   created_by: "e1d5b42c-4ddf-472c-84bb-9685d784edbb",
  //   id: "8e7fa62e-bc17-41d7-b62c-1923517db588",
  //   is_markdown: false,
  //   is_private: false,
  //   order_key: 1,
  //   project_id: "8e7fa62e-bc17-41d7-b62c-1923517db589",
  //   xfkey: "e63002ae-491a-42f3-ab26-79eb2f8948e2",
  //   xftype: "LABELING_TASK",
  //   open: true,
  //   edit: false,
  //   creationUser: "Jens",
  //   xfkeyAdd: "Task abc",
  // }
  myUser: any;
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
  }
  ngOnInit(): void {
    this.initDataManger();
    UserManager.registerAfterInitActionOrRun(this, () => this.initUsers(), true);
  }

  private initUsers() {
    this.myUser = UserManager.getUser(false);
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
    if (this.commentTypeOptions.length > 0 && !this.newComment.commentType) this.switchCommentType(0);
  }

  switchCommentType(index: number) {
    if (index > this.commentTypeOptions.length) return;
    this.newComment.commentType = this.commentTypeOptions[index].key;
    this.newComment.commentTypeReadable = this.commentTypeOptions[index].name;
    this.commentIdOptions = this.dm.getCommentIdOptions(this.newComment.commentType);
    this.newComment.commentId = "";
    this.newComment.commentIdReadable = "";
  }
  switchCommentId(index: number) {
    if (index > this.commentIdOptions.length) return;
    this.newComment.commentId = this.commentIdOptions[index].id;
    this.newComment.commentIdReadable = this.commentIdOptions[index].name;
    if (!this.newComment.commentIdReadable) this.newComment.commentIdReadable = 'unknown id';

  }
  saveCommentToDb(comment: string, isPrivate: boolean) {
    this.dm.createComment(comment, this.newComment.commentType, this.newComment.commentId, isPrivate);
  }

  deleteComment(commentId: string, projectId: string = null) {
    this.dm.deleteComment(commentId, projectId);
  }
  updateComment(commentId: string, toChangeKey: string, toChangeValue: any) {
    const changes = {};
    changes[toChangeKey] = toChangeValue;
    const projectId = this.dm.currentData[commentId].project_id;
    this.dm.updateComment(commentId, JSON.stringify(changes), projectId);
    this.dm.currentData[commentId][toChangeKey] = toChangeValue;
    if (toChangeKey == 'comment') this.dm.currentData[commentId].edit = false;
  }
  preventEventPropagation(event: Event) {
    event.stopPropagation();
    event.stopImmediatePropagation();
  }
  editComment(commentData: any) {
    if (commentData.edit) {
      commentData.edit = false;
      commentData.open = false;
    } else {
      commentData.edit = true;
      commentData.open = true;
    }
  }
}
