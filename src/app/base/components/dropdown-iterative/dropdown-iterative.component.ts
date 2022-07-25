import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'kern-dropdown-iterative',
  templateUrl: './dropdown-iterative.component.html',
  styleUrls: ['./dropdown-iterative.component.scss']
})
export class DropdownIterativeComponent implements OnInit {

  @Input() arrayOptions = [];
  @Input() condition;
  @Input() valueIfConditionTrue;
  @Input() valueIfConditionFalse;
  @Input() buttonTooltip: string;
  @Input() labelingTasks;
  @Input() property: string;
  @Input() optionProperty: string;
  @Input() disabledCondition: boolean;
  
  @Output() optionClicked = new EventEmitter<string>();

  constructor() { }

  ngOnInit(): void {
  }

  toggleVisible(isVisible: boolean, menuButton: HTMLDivElement): void {
    if (isVisible) {
      menuButton.classList.remove('hidden');
      menuButton.classList.add('block');
      menuButton.classList.add('z-10');
    } else {
      menuButton.classList.remove('z-10');
      menuButton.classList.remove('block');
      menuButton.classList.add('hidden');
    }
  }

  performActionOnOption(property: string) {
    this.optionClicked.emit(property);
  }

}
