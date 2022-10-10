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

  myUser: any;
  newComment = {
    areaOpen: false,
    commentType: "",
    commentTypeReadable: "",
    commentId: "",
    commentIdReadable: "",
  }
  commentIdOptions: any[];
  allOpen: boolean = false;

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
    this.dm.registerUpdateCommentModule(() => this.newIdOptions(true));
  }

  openAddNewComment() {
    this.newComment.areaOpen = true;
    if (this.dm.currentCommentTypeOptions.length > 0 && !this.newComment.commentType) this.switchCommentType(0);
  }

  newIdOptions(keepExisting: boolean = false) {
    if (!this.newComment.commentType) return;
    this.commentIdOptions = this.dm.getCommentKeyOptions(this.newComment.commentType);
    if (keepExisting) return;
    if (this.commentIdOptions.length == 1) this.switchCommentId(0);
    else {
      this.newComment.commentId = "";
      this.newComment.commentIdReadable = "";
    }
  }

  switchCommentType(index: number) {
    if (index > this.dm.currentCommentTypeOptions.length) return;
    this.newComment.commentType = this.dm.currentCommentTypeOptions[index].key;
    this.newComment.commentTypeReadable = this.dm.currentCommentTypeOptions[index].name;
    this.newIdOptions();
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

  deleteComment(event: Event, commentId: string, projectId: string = null) {
    this.preventEventPropagation(event);
    this.dm.deleteComment(commentId, projectId);
  }
  updateComment(event: Event, commentId: string, toChangeKey: string, toChangeValue: any) {
    this.preventEventPropagation(event);
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
  editComment(event: Event, commentData: any) {
    this.preventEventPropagation(event);
    if (commentData.edit) {
      commentData.edit = false;
      commentData.open = false;
    } else {
      commentData.edit = true;
      commentData.open = true;
    }
    this.checkAllOpen();
  }
  checkAllOpen() {
    for (const key in this.dm.currentData) {
      if (!this.dm.currentData[key].open) {
        this.allOpen = false;
        return;
      }
    }
    this.allOpen = true;
  }
  openAllComments(value: boolean) {
    for (const key in this.dm.currentData) this.dm.currentData[key].open = value;
    this.allOpen = value;
  }
}
