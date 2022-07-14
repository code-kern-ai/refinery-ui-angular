import { Pipe } from '@angular/core';
@Pipe({ name: 'percentRound', pure: true })
export class PercentRoundPipe {
    transform(value:number | string, decimals:number,isZeroToOne:boolean=true) {
        if(typeof value == 'number') {
            if (isNaN(value)) return "n/a";
            if(!isFinite(value)) return "0 %";
            if(isZeroToOne)value*=100;
            const dec = 10**decimals;
            return Math.round(value * dec)/dec + ' %';
        }
        else if(typeof value == 'undefined' || value == null) return "n/a";
        return value;
    }
}