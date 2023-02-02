import {
  Directive,
  HostListener,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
} from '@angular/core';

@Directive({
  selector: '[hover-group], [hover-group-class]',
})
export class HoverGroupDirective implements OnDestroy, OnInit {
  constructor(public elementRef: ElementRef) { }
  //caution! the first N groups are the main groups and used to highlight corresponding elements
  //the other provided groups are only meant as additional highlight conditions
  // N = groupCount
  @Input('hover-group') hoverGroup: any;
  @Input('hover-group-class') hoverClass: any;
  @Input('hover-group-main-count') groupCount: any = 1;

  private finalGroups: string[];
  public static disableHover = false;

  @HostListener('mouseenter') onMouseEnter() {
    if (HoverGroupDirective.disableHover) return;
    if (!this.finalGroups || this.finalGroups.length == 0) return;
    for (let i = 0; i < this.groupCount; i++) {
      if (i >= this.finalGroups.length) break;
      const highlightGroup = this.finalGroups[i];
      for (let e of HoverGroupElementRefs.getElements(highlightGroup)) {
        if (!e.hoverClass) continue;
        for (let v of e.hoverClass.split(' ')) {
          if (v) e.elementRef.nativeElement.classList.add(v);
        }
      }

    }
  }

  @HostListener('mouseleave') onMouseLeave() {
    if (HoverGroupDirective.disableHover) return;
    if (!this.finalGroups || this.finalGroups.length == 0) return;
    for (let i = 0; i < this.groupCount; i++) {
      if (i >= this.finalGroups.length) break;
      const highlightGroup = this.finalGroups[i];
      for (let e of HoverGroupElementRefs.getElements(highlightGroup)) {
        if (!e.hoverClass) continue;
        for (let v of e.hoverClass.split(' ')) {
          if (v) e.elementRef.nativeElement.classList.remove(v);
        }
      }
    }
  }

  ngOnDestroy(): void {
    for (const g of this.finalGroups)
      HoverGroupElementRefs.removeElement(g, this);
  }

  ngOnInit(): void {
    if (!this.hoverGroup) this.finalGroups = ['dummy-group'];
    if (typeof this.groupCount == 'string') this.groupCount = parseInt(this.groupCount);
    if (this.groupCount < 1) this.groupCount = 1;

    if (!Array.isArray(this.hoverGroup))
      this.finalGroups = this.hoverGroup.split(',').map((v) => v.trim());
    else this.finalGroups = this.hoverGroup;
    for (const g of this.finalGroups) HoverGroupElementRefs.push(g, this);

  }

}

class HoverGroupElementRefs {
  static elementArray: { [groupName: string]: Array<HoverGroupDirective> } = {};

  static push(groupName: string, el: HoverGroupDirective) {
    if (!HoverGroupElementRefs.elementArray[groupName])
      HoverGroupElementRefs.elementArray[groupName] = [];
    HoverGroupElementRefs.elementArray[groupName].push(el);
  }
  static getElements(groupName: string): Array<HoverGroupDirective> {
    return HoverGroupElementRefs.elementArray[groupName];
  }
  static removeElement(groupName: string, el: HoverGroupDirective) {
    let arr = HoverGroupElementRefs.getElements(groupName);
    if (arr) {
      const index = arr.indexOf(el);
      if (index > -1) {
        arr.splice(index, 1);
        if (arr.length == 0)
          delete HoverGroupElementRefs.elementArray[groupName];
      }
    }
    return true;
  }

  static clear() {
    HoverGroupElementRefs.elementArray = {};
  }
}
