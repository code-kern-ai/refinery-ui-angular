
import { Component, ElementRef, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { timer } from 'rxjs';
import { ModalButton, modalButtonCaption, ModalButtonType } from './modal-helper';
import { isStringTrue } from 'submodules/javascript-functions/general';



@Component({
  selector: 'kern-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss'],

})
export class ModalComponent implements OnInit, OnChanges {

  @Input() isOpen: boolean = false;
  //only set if you want to use the default button
  //set to true if you want to use the default button
  @Input() closeButton: ModalButton;
  @Input() acceptButton: ModalButton;
  @Input() abortButton: ModalButton;
  @Input() backButton: ModalButton;
  @Input() modalBoxStyle: {};

  @Output() optionClicked = new EventEmitter<string | any>();
  @ViewChild("backdrop") backdrop: ElementRef;
  @ViewChild("modalBox") modalBox: ElementRef;


  private lastOpenState: boolean;

  constructor(
  ) { }
  ngOnInit(): void {
    this.lastOpenState = this.isOpen;
  }
  ngOnChanges(changes: SimpleChanges): void {
    this.fillButtons();
    if (changes.isOpen) {
      this.changeOpenState(changes.isOpen.currentValue);
    }

  }
  private fillButtons() {
    if (this.closeButton == undefined) this.closeButton = { useButton: false };
    else {
      if (typeof this.closeButton == "string") this.closeButton = { useButton: isStringTrue(this.closeButton as string) };
      else if (typeof this.closeButton == "boolean") this.closeButton = { useButton: this.closeButton };
      if (this.closeButton) this.initButton(this.closeButton, ModalButtonType.CLOSE);
    }
    if (this.acceptButton == undefined) this.acceptButton = { useButton: false };
    else {
      if (typeof this.acceptButton == "string") this.acceptButton = { useButton: isStringTrue(this.acceptButton as string) };
      else if (typeof this.acceptButton == "boolean") this.acceptButton = { useButton: this.acceptButton };
      if (this.acceptButton) this.initButton(this.acceptButton, ModalButtonType.ACCEPT);
    }
    if (this.abortButton == undefined) this.abortButton = { useButton: false };
    else {
      if (typeof this.abortButton == "string") this.abortButton = { useButton: isStringTrue(this.abortButton as string) };
      else if (typeof this.abortButton == "boolean") this.abortButton = { useButton: this.abortButton };
      if (this.abortButton) this.initButton(this.abortButton, ModalButtonType.ABORT);
    }
    if (this.backButton == undefined) this.backButton = { useButton: false };
    else {
      if (typeof this.backButton == "string") this.backButton = { useButton: isStringTrue(this.backButton as string) };
      else if (typeof this.backButton == "boolean") this.backButton = { useButton: this.backButton };
      if (this.backButton) this.initButton(this.backButton, ModalButtonType.BACK);
    }
  }
  private initButton(button: ModalButton, buttonType: ModalButtonType) {
    if (button) {
      button.type = buttonType;
      if (button.useButton != false) button.useButton = true;
      if (!button.buttonCaption) button.buttonCaption = modalButtonCaption(buttonType);
      if (!button.disabled) button.disabled = false;
      if (button.closeAfterClick != false) button.closeAfterClick = true;
    }
  }

  private changeOpenState(newState: boolean) {
    if (!this.backdrop?.nativeElement) return;
    if (this.lastOpenState == newState) return;
    if (this.isOpen != newState) this.isOpen = newState;
    const classlistBackdrop = this.backdrop.nativeElement.classList;
    const classlistModalBox = this.modalBox.nativeElement.classList;
    if (newState) {
      classlistBackdrop.add("ease-out", "duration-300", "opacity-100");
      classlistModalBox.add("ease-out", "duration-300", "opacity-100", "translate-y-0", "sm:scale-100");
      timer(300).subscribe(() => {
        classlistBackdrop.remove("ease-out", "duration-300");
        classlistModalBox.remove("ease-out", "duration-300");
      });
    } else {
      classlistBackdrop.add("ease-in", "duration-200");
      classlistBackdrop.remove("opacity-100");
      classlistModalBox.add("ease-in", "duration-200");
      classlistModalBox.remove("opacity-100", "translate-y-0", "sm:scale-100");
      timer(200).subscribe(() => {
        classlistBackdrop.remove("ease-in", "duration-200");
        classlistModalBox.remove("ease-in", "duration-200");
      });
    }
    this.lastOpenState = newState;
  }

  clickButton(button: ModalButton) {
    if (button.emitFunction) button.emitFunction.call(button.emitObject ? button.emitObject : button, button.type);

    if (this.optionClicked.observers.length > 0) this.optionClicked.emit(button.type);

    if (button.closeAfterClick) this.changeOpenState(false);
  }
}
