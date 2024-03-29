import { animate, state, style, transition, trigger } from '@angular/animations';
import { AfterContentChecked, ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { timer } from 'rxjs';
import { UserManager } from 'src/app/util/user-manager';
import { CommentDataManager, CommentType, CommentPosition } from './comment-helper';

@Component({
  selector: 'kern-comment',
  animations: [
    trigger('popOverState', [
      state('showRight', style({
        transform: "translateX(0%)",
      })),
      state('showLeft', style({
        transform: "translateX(0%)",
      })),
      state('hideRight', style({
        transform: "translateX(100%)"
      })),
      state('hideLeft', style({
        transform: "translateX(-100%)"
      })),
      transition('* => *', animate('500ms ease')),
    ])
  ],
  templateUrl: './comment.component.html',
  styleUrls: ['./comment.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CommentComponent implements OnInit, AfterContentChecked, OnDestroy {
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
  isSlideOverOpen: boolean = false;
  positionComment: string = CommentPosition.RIGHT;

  constructor(private cdRef: ChangeDetectorRef) { }
  ngOnInit(): void {
    this.initDataManger();
    UserManager.registerAfterInitActionOrRun(this, () => this.initUsers(), true);
    this.positionComment = localStorage.getItem('commentPosition') || CommentPosition.RIGHT;
  }
  ngOnDestroy(): void {
  }
  ngAfterContentChecked(): void {
    this.cdRef.detectChanges();
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
    this.commentIdOptions = [...this.dm.getCommentKeyOptions(this.newComment.commentType)];
    if (this.newComment.commentType == CommentType.RECORD) {
      this.setNewCommentsToLastElement();
    }
    this.checkNewValues();
    if (keepExisting) return;
    this.initNewCommentData();
  }
  checkNewValues() {
    if (!this.dm.currentCommentTypeOptions.some((option) => option.key == this.newComment.commentType)) {
      this.newComment.commentType = "";
      this.newComment.commentTypeReadable = "";
    }
    if (!this.commentIdOptions.some((option) => option.id == this.newComment.commentId)) {
      this.newComment.commentId = "";
      this.newComment.commentIdReadable = "";
    }
  }

  initNewCommentData() {
    if (this.commentIdOptions.length == 1) this.switchCommentId(0);
    else {
      this.newComment.commentId = "";
      this.newComment.commentIdReadable = "";
    }
  }

  setNewCommentsToLastElement() {
    const lastElement = this.dm.grabLastRecordInfo();
    if (!lastElement) return;
    this.newComment.commentId = lastElement.id;
    this.newComment.commentIdReadable = lastElement.name;
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
  executeOption(option: any, cData: any) {
    switch (option.value) {
      case 'Edit':
        this.editComment(option.event, cData);
        break;
      case 'Public':
      case 'Private':
        this.updateComment(option.event, cData.id, 'is_private', !cData.is_private);
        break;
      case 'Delete':
        this.deleteComment(option.event, cData.id, cData.project_id);
        break;
    }
  }
  changeCommentPosition() {
    this.positionComment = this.positionComment == CommentPosition.RIGHT ? CommentPosition.LEFT : CommentPosition.RIGHT;
    localStorage.setItem('commentPosition', this.positionComment);
  }
  get stateName() {
    return this.isSlideOverOpen && this.positionComment == CommentPosition.RIGHT
      ? 'showRight' : this.isSlideOverOpen && this.positionComment == CommentPosition.LEFT
        ? 'showLeft' : !this.isSlideOverOpen && this.positionComment == CommentPosition.RIGHT
          ? 'hideRight' : 'hideLeft';
  }
  toggleSlideOver() {
    this.isSlideOverOpen = !this.isSlideOverOpen;
  }

  markAsPrivateComment(privateComment: any) {
    privateComment.checked = !privateComment.checked;
  }

  checkIfKeyShiftEnterUpdate(event: KeyboardEvent, id: string, commentText) {
    if (event.shiftKey && event.key === "Enter") {
      this.updateComment(event, id, 'comment', commentText);
    }
  }

  checkIfKeyShiftEnterSave(event: KeyboardEvent, commentBox: HTMLInputElement, isPrivate: HTMLInputElement) {
    if (commentBox.value != '' && this.newComment.commentId != '' && event.shiftKey && event.key === "Enter") {
      this.saveCommentToDb(commentBox.value, isPrivate.checked);
      commentBox.value = '';
      isPrivate.checked = false;
    }
  }

}
