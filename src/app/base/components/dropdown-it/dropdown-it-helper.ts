import { FormArray } from "@angular/forms";

/**
 * Optionset for kern dropdown
 * @optionArray {string[] | FormArray[] | any[]} - Can be any array. string array is just used, FormArray or any object array tries to use "name" property then "text" last first string property
 * @buttonCaption {string, optional} - used as caption for the button, if not given the first / current value is used
 * @valuePropertyPath {string, optional} - if undefined option text is returned, else (e.g. name.tmp.xyz) the path is split and used to access the object property
 * @keepDropdownOpen {boolean, optional} - stops the event propagation of the click event and therfore keeps the menu open
 * @buttonTooltip {string, optional} - adds a tooltip if defined
 * @isDisabled {boolean, optional} - disables the dropdown
 * @isOptionDisabled {boolean[], optional} - disables the dropdown option (needs to be the exact same length as the optionArray)
 * @optionIcons {string[], optional} - displays a predfined icon if set for the index (needs to be the exact same length as the optionArray)
 * @hasCheckboxes {boolean, optional} - helper for checkbox like dropdowns (e.g. data browser)
 */
export type DropdownOptions = {
    optionArray: string[] | FormArray[] | any[];
    buttonCaption?: string;
    valuePropertyPath?: string;
    keepDropdownOpen?: boolean;
    buttonTooltip?: string;
    isDisabled?: boolean;
    isOptionDisabled?: boolean[];
    optionIcons?: string[];
    hasCheckboxes?: boolean;
};

