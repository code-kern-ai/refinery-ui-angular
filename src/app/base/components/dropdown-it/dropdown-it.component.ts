import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { AbstractControl, FormGroup } from '@angular/forms';
import { DropdownOptions } from './dropdown-it-helper';

@Component({
  selector: 'kern-dropdown-it',
  templateUrl: './dropdown-it.component.html',
  styleUrls: ['./dropdown-it.component.scss']
})
export class DropdownItComponent implements OnChanges {

  @Input() dropdownOptions: DropdownOptions;
  // @Input() condition;
  // @Input() valueIfConditionTrue;
  // @Input() valueIfConditionFalse;
  // @Input() buttonTooltip: string;
  // @Input() labelingTasks;
  // @Input() property: string;
  // @Input() optionProperty: string;
  // @Input() disabledCondition: boolean;
  // @Input() hasCheckboxes: boolean;
  // @Input() formArrayName: string;

  @Output() optionClicked = new EventEmitter<string>();

  private hasInputErrors: string;


  buttonClassList: string;
  dropdownClassList: string;
  dropdownOptionCaptions: string[];
  useValueAsCaption: boolean = false;

  constructor() { }
  ngOnChanges(changes: SimpleChanges): void {
    console.log("changed something", changes, this.dropdownOptions);
    this.dropdownOptionCaptions = this.getTextArray(this.dropdownOptions.optionArray);
    this.runInputChecks();
    this.buildHelperValues();
  }

  private getTextArray(arr: string[] | any[]): string[] {
    if (!arr) return [];
    if (arr.length == 0) return [];
    console.log(typeof arr[0])
    if (typeof arr[0] == 'string') return arr as string[];
    if (arr[0].name) return arr.map(a => a.name);
    if (arr[0].text) return arr.map(a => a.text);

    let firstStringKey = "";

    for (const key of Object.keys(arr[0])) {
      if (typeof arr[0][key] == 'string') {
        firstStringKey = key;
        break;
      }
    }
    if (!firstStringKey) throw new Error("Cant find text in given array - dropdown");
    return arr.map(a => a[firstStringKey]);
  }

  private buildHelperValues() {
    this.buttonClassList = "";
    this.buttonClassList += this.dropdownOptions.isDisabled ? 'opacity-50 cursor-not-allowed' : 'opacity-100 cursor-pointer';
    this.buttonClassList += this.dropdownOptions.buttonTooltip ? 'tooltip tooltip-right' : '';
    this.dropdownClassList = this.dropdownOptions.hasCheckboxes ? 'w-80' : 'w-auto';
    this.buttonClassList += this.dropdownClassList;
  }

  private runInputChecks() {
    this.hasInputErrors = "";
    if (!this.dropdownOptions) this.hasInputErrors = "no dropdown options provided\n";
    if (!this.dropdownOptions.optionArray || this.dropdownOptions.optionArray.length == 0) this.hasInputErrors = "no text provided\n";
    if (!this.dropdownOptions.buttonCaption && this.dropdownOptionCaptions.length > 0) {
      this.dropdownOptions.buttonCaption = this.dropdownOptionCaptions[0];
      this.useValueAsCaption = true;
    }
    if (this.dropdownOptions.isOptionDisabled && this.dropdownOptions.isOptionDisabled.length != this.dropdownOptions.optionArray.length) this.hasInputErrors = "array options != isOptionDisabled length\n";
    if (this.dropdownOptions.optionIcons && this.dropdownOptions.optionIcons.length != this.dropdownOptions.optionIcons.length) this.hasInputErrors = "array options != optionIcons length\n";


    if (this.dropdownOptions.hasCheckboxes) {

    }

    if (this.hasInputErrors) console.log(this.hasInputErrors);

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

  performActionOnOption(event: MouseEvent, clickIndex: number) {
    if (this.dropdownOptions.stopClickPropagation) event.stopPropagation();

    if (clickIndex >= this.dropdownOptions.optionArray.length) {
      console.log("something is wrong in the click action of the dropdown component");
      return;
    }

    if (!this.dropdownOptions.valuePropertyPath) {
      if (this.useValueAsCaption) this.dropdownOptions.buttonCaption = this.dropdownOptionCaptions[clickIndex];
      this.optionClicked.emit(this.dropdownOptionCaptions[clickIndex]);
      return;
    }

    const splittedPath = this.dropdownOptions.valuePropertyPath.split(".");

    let tmp = this.dropdownOptions.optionArray[clickIndex];
    for (const key of splittedPath) {
      tmp = tmp[key];
    }
    if (typeof tmp != "string") {
      console.log("something is wrong in the click action of the dropdown component - property path");
      return;
    }
    if (this.useValueAsCaption) this.dropdownOptions.buttonCaption = tmp;
    this.optionClicked.emit(tmp);

  }

  // getActiveNegateGroupColor(group: FormGroup) {
  //   if (!group.get('active').value) return null;
  //   if (group.contains('negate'))
  //     return group.get('negate').value ? '#ef4444' : '#2563eb';
  //   return '#2563eb';
  // }


  // getDropdownDisplayText(
  //   formControls: AbstractControl[],
  //   labelFor: string
  // ): string {
  //   let text = '';
  //   let atLeastOneNegated: boolean = false;
  //   for (let c of formControls) {
  //     const hasNegate = Boolean(c.get('negate'));
  //     if (labelFor == 'EMPTY' && c.get('active').value) return '';
  //     else if (
  //       labelFor == 'NOT_NEGATED' &&
  //       c.get('active').value &&
  //       (!hasNegate || (hasNegate && !c.get('negate').value))
  //     ) {
  //       text += (text == '' ? '' : ', ') + c.get('name').value;
  //     } else if (
  //       labelFor == 'NEGATED' &&
  //       c.get('active').value &&
  //       hasNegate &&
  //       c.get('negate').value
  //     ) {
  //       text += (text == '' ? '' : ', ') + c.get('name').value;
  //     }
  //     if (
  //       !atLeastOneNegated &&
  //       c.get('active').value &&
  //       hasNegate &&
  //       c.get('negate').value
  //     )
  //       atLeastOneNegated = true;
  //   }
  //   if (labelFor == 'EMPTY') return 'None Selected';

  //   if (labelFor == 'NOT_NEGATED' && atLeastOneNegated && text != '')
  //     return text + ', ';

  //   return text;
  // }
}
