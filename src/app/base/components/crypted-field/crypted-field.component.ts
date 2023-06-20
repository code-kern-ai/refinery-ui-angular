import { Component, EventEmitter, OnInit, Output } from '@angular/core';

@Component({
  selector: 'kern-crypted-field',
  templateUrl: './crypted-field.component.html',
  styleUrls: ['./crypted-field.component.scss']
})
export class CryptedFieldComponent implements OnInit {
  cryptedValue: string;
  @Output() cryptedValueChange = new EventEmitter<string>();

  constructor() { }

  ngOnInit(): void {
  }

  setCryptedValue(cryptedValue: string) {
    this.cryptedValue = cryptedValue;
    this.cryptedValueChange.emit(cryptedValue);
  }

}
