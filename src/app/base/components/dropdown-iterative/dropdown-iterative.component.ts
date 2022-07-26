import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { AbstractControl, FormGroup } from '@angular/forms';

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
  @Input() hasCheckboxes: boolean;
  @Input() formArrayName: string;
  
  @Output() optionClicked = new EventEmitter<string>();

  constructor() { }

  ngOnInit(): void {
  }

  toggleVisible(isVisible: boolean, dropdownOptions: HTMLDivElement): void {
    if (isVisible) {
      dropdownOptions.classList.remove('hidden');
      dropdownOptions.classList.add('block');
      dropdownOptions.classList.add('z-10');
    } else {
      dropdownOptions.classList.remove('z-10');
      dropdownOptions.classList.remove('block');
      dropdownOptions.classList.add('hidden');
    }
  }

  performActionOnOption(property: string, event?: Event) {
    if(this.hasCheckboxes) event.stopPropagation();
    this.optionClicked.emit(property);
  }

  getActiveNegateGroupColor(group: FormGroup) {
    if (!group.get('active').value) return null;
    if (group.contains('negate'))
      return group.get('negate').value ? '#ef4444' : '#2563eb';
    return '#2563eb';
  }


  getDropdownDisplayText(
    formControls: AbstractControl[],
    labelFor: string
  ): string {
    let text = '';
    let atLeastOneNegated: boolean = false;
    for (let c of formControls) {
      const hasNegate = Boolean(c.get('negate'));
      if (labelFor == 'EMPTY' && c.get('active').value) return '';
      else if (
        labelFor == 'NOT_NEGATED' &&
        c.get('active').value &&
        (!hasNegate || (hasNegate && !c.get('negate').value))
      ) {
        text += (text == '' ? '' : ', ') + c.get('name').value;
      } else if (
        labelFor == 'NEGATED' &&
        c.get('active').value &&
        hasNegate &&
        c.get('negate').value
      ) {
        text += (text == '' ? '' : ', ') + c.get('name').value;
      }
      if (
        !atLeastOneNegated &&
        c.get('active').value &&
        hasNegate &&
        c.get('negate').value
      )
        atLeastOneNegated = true;
    }
    if (labelFor == 'EMPTY') return 'None Selected';

    if (labelFor == 'NOT_NEGATED' && atLeastOneNegated && text != '')
      return text + ', ';

    return text;
  }
}
