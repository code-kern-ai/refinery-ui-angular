import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';

@Component({
  selector: 'kern-crypted-field',
  templateUrl: './crypted-field.component.html',
  styleUrls: ['./crypted-field.component.scss']
})
export class CryptedFieldComponent implements OnDestroy {
  @Input() label: string = 'Password';
  @Input() displayOptionalAsText: boolean = false;
  @Output() keyChange = new EventEmitter<string>();
  key: string = '';
  show: boolean = false;

  constructor() { }

  ngOnDestroy(): void {
    this.key = '';
    this.keyChange.emit(this.key);
  }

  setKey(key: string) {
    this.key = key;
    this.keyChange.emit(key);
  }

  toggleKey() {
    this.show = !this.show;
  }

}
