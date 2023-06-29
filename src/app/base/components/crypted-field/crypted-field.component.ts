import { Component, ElementRef, EventEmitter, Input, OnDestroy, Output, ViewChild } from '@angular/core';

const HIDDEN = '●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●';

@Component({
  selector: 'kern-crypted-field',
  templateUrl: './crypted-field.component.html',
  styleUrls: ['./crypted-field.component.scss']
})
export class CryptedFieldComponent implements OnDestroy {
  @Input() label: string = 'Password';
  @Input() displayOptionalAsText: boolean = false;
  @Output() keyChange = new EventEmitter<string>();

  @ViewChild('inputElement') inputElement: ElementRef;
  key: string = '';
  hiddenKey: string = '';
  show: boolean = false;
  saveKey: string = '';

  constructor() { }

  ngOnDestroy(): void {
    this.key = '';
    this.keyChange.emit(this.key);
  }

  setKey(key: any) {
    this.saveKey += key[key.length - 1];
    this.key = key;
    this.hiddenKey = HIDDEN.substring(0, this.key.length);
    this.keyChange.emit(this.saveKey);
  }

  toggleKey() {
    this.show = !this.show;
  }


  onBackspace(event) {
    if (this.inputElement.nativeElement.selectionStart === 0) {
      this.inputElement.nativeElement.value = '';
      this.key = '';
      this.saveKey = '';
      this.hiddenKey = '';
      this.keyChange.emit(this.saveKey);
      return;
    }
    if (event.key === 'Backspace') {
      event.preventDefault();
      this.saveKey = this.saveKey.substring(0, this.saveKey.length - 1);
      this.key = this.key.substring(0, this.key.length - 1);
      this.hiddenKey = HIDDEN.substring(0, this.key.length);
      this.keyChange.emit(this.saveKey);
    }
  }
}
