import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { HighlightSearch, RegexDisplay, RegexMatch } from './helper';
import { isStringTrue } from 'submodules/javascript-functions/general';

@Component({
  selector: 'kern-highlight',
  templateUrl: './highlight.component.html',
  styleUrls: ['./highlight.component.scss'],
})
export class HighlightComponent implements OnInit {
  @Input() text: string;
  @Input() regex: RegExp[] | RegExp;
  @Input() searchFor: string[] | string;
  @Input() matchCase: boolean | string = false;

  @Input() searchForExtended: HighlightSearch[] = [];
  @Input() highlightClass: string = 'bg-yellow-300';
  @Input() additionalClasses: string[] = [];

  parts: RegexDisplay[] = [];
  finalRegex: RegExp[];

  addClassString: string = '';

  constructor() {
  }

  ngOnInit(): void {
    // this.buildEverything();
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.buildEverything();
    if (changes.additionalClasses) this.addClassString = this.additionalClasses.join(' ');
  }

  private buildEverything() {
    this.finalRegex = [];
    if (typeof this.matchCase == 'string') this.matchCase = isStringTrue(this.matchCase);
    if (this.regex) Array.isArray(this.regex) ? this.finalRegex.push(...this.regex) : this.finalRegex.push(this.regex);
    if (this.searchFor) this.finalRegex.push(...this.buildRegexps());
    if (this.searchForExtended) {
      for (const search of this.searchForExtended) {
        if (search.regex) this.finalRegex.push(search.regex);
        else if (search.searchFor) this.finalRegex.push(this.buildRegex(search.searchFor, search.matchCase));
      }
    }
    this.rebuildText();
  }

  private rebuildText() {
    if (!this.text) return;
    if (this.finalRegex.length == 0) {
      this.parts = [{ text: this.text, isMatch: false }];
      return;
    }
    const optimizedMatches = this.mergeIntervals(this.getAllMatches());
    this.parts = [];
    let start = 0;
    for (const match of optimizedMatches) {
      if (match.start > start) {
        this.parts.push({ text: this.text.slice(start, match.start), isMatch: false });
      }
      this.parts.push({ text: this.text.slice(match.start, match.end), isMatch: true });
      start = match.end;
    }
    if (start < this.text.length) {
      this.parts.push({ text: this.text.slice(start), isMatch: false });
    }

  }

  private buildRegexps(): RegExp[] {
    if (!Array.isArray(this.searchFor)) {
      this.searchFor = [this.searchFor];
    }
    const toReturn = [];
    for (const search of this.searchFor) {
      toReturn.push(new RegExp(search, this.matchCase ? 'g' : 'gi'));
    }
    return toReturn;
  }

  private buildRegex(search: string, matchCase: boolean): RegExp {
    return new RegExp(search, matchCase ? 'g' : 'gi')
  }

  private getAllMatches(): RegexMatch[] {
    const toReturn = [];
    for (const regex of this.finalRegex) {
      const matches = this.text.matchAll(regex);
      for (const match of matches) {
        const optimizedMatch: RegexMatch = {
          start: match.index,
          end: match.index + match[0].length
        }
        toReturn.push(optimizedMatch);
      }
    }
    return toReturn;
  }

  private mergeIntervals(intervals: RegexMatch[]) {
    if (intervals.length < 2) return intervals;

    intervals.sort((a, b) => a.start - b.start);

    const result = [];
    let previous = intervals[0];

    for (let i = 1; i < intervals.length; i += 1) {
      if (previous.end >= intervals[i].start) {
        previous = { start: previous.start, end: Math.max(previous.end, intervals[i].end) };
      } else {
        result.push(previous);
        previous = intervals[i];
      }
    }

    result.push(previous);

    return result;
  };

}

