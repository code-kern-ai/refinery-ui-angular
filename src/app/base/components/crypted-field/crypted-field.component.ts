import { Component, ElementRef, EventEmitter, Input, OnDestroy, Output, ViewChild } from '@angular/core';


@Component({
  selector: 'kern-crypted-field',
  templateUrl: './crypted-field.component.html',
  styleUrls: ['./crypted-field.component.scss']
})
export class CryptedFieldComponent implements OnDestroy {
  @Input() label: string = 'Password';
  @Input() placeholder: string = 'Enter some password here...';
  @Input() displayOptionalAsText: boolean = true;
  @Output() keyChange = new EventEmitter<string>();

  @ViewChild('inputElement') inputElement: ElementRef;
  key: string = '';
  show: boolean = false;

  constructor() { }

  ngOnDestroy(): void {
    this.key = '';
    this.keyChange.emit(this.key);
  }

  setKey(key: any) {
    this.key = key;
    this.keyChange.emit(this.key);
  }

  toggleKey() {
    this.show = !this.show;
  }
}
