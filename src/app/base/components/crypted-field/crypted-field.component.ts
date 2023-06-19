import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'kern-crypted-field',
  templateUrl: './crypted-field.component.html',
  styleUrls: ['./crypted-field.component.scss']
})
export class CryptedFieldComponent implements OnInit {
  cryptedValue: string = '';

  constructor() { }

  ngOnInit(): void {
  }

}
