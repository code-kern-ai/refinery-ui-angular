import { Component, EventEmitter, OnInit, Output } from '@angular/core';

@Component({
  selector: 'kern-crypted-field',
  templateUrl: './crypted-field.component.html',
  styleUrls: ['./crypted-field.component.scss']
})
export class CryptedFieldComponent implements OnInit {
  @Output() keyChange = new EventEmitter<string>();
  key: string = '';
  show: boolean = false;

  constructor() { }

  ngOnInit(): void {
  }

  setKey(key: string) {
    this.key = key;
    this.keyChange.emit(key);
  }

  toggleKey() {
    this.show = !this.show;
  }

}
