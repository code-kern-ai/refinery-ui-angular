import { Pipe, PipeTransform } from '@angular/core';
import { KeyValuePipe } from '@angular/common';
import { KeyValueDiffers } from '@angular/core';
const unordered = (a, b) => 0

@Pipe({
    name: 'defaultOrderKeyvalue'
})

export class DefaultOrderKeyvaluePipe implements PipeTransform {

    constructor(public differs: KeyValueDiffers) { };
    public transform(value, compareFn = unordered) {
        let pipe = new KeyValuePipe(this.differs);
        return pipe.transform(value, compareFn)
    }
}