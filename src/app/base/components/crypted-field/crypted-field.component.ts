import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'kern-crypted-field',
  templateUrl: './crypted-field.component.html',
  styleUrls: ['./crypted-field.component.scss']
})
export class CryptedFieldComponent {
  @Output() keyChange = new EventEmitter<string>();
  key: string = '';
  show: boolean = false;

  constructor() { }

  setKey(key: string) {
    this.key = key;
    this.keyChange.emit(key);
  }

  toggleKey() {
    this.show = !this.show;
  }

}
