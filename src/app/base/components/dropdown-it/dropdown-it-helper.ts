import { FormArray } from "@angular/forms";

/**
 * Optionset for kern dropdown
 * @buttonCaption {string} - used as caption for the button
 * @optionArray {string[] | FormArray[] | any[]} - Can be any array. string array is just used, FormArray or any object array tries to use "name" property then "text" last first string property
 * @valuePropertyPath {string, optional} - if undefined option text is returned, else (e.g. name.tmp.xyz) the path is split and used to access the object property
 * @stopClickPropagation {boolean, optional} - stops the event propagation of the click event 
 * @buttonTooltip {string, optional} - adds a tooltip if defined
 * @isDisabled {boolean, optional} - disables the dropdown
 * @isOptionDisabled {boolean[], optional} - disables the dropdown option (needs to be the exact same length as the optionArray)
 * @hasCheckboxes {boolean, optional} - used for checkbox like dropdowns (e.g. data browser)
 */
export type DropdownOptions = {
    buttonCaption: string;
    optionArray: string[] | FormArray[] | any[];
    valuePropertyPath?: string;
    stopClickPropagation?: boolean;
    buttonTooltip?: string;
    isDisabled?: boolean;
    isOptionDisabled?: boolean[];//to be implmemented
    hasCheckboxes?: boolean; //to be implmemented
};
//TODO: add more optoins & ensure size of dropdown items is at least size of button

