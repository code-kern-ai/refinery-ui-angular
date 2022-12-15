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
  //caution! the first group is the main group and used to highlight corresponding elements
  //the other provided groups are only meant as additional highlight conditions
  @Input('hover-group') hoverGroup: any;
  @Input('hover-group-class') hoverClass: any;

  private finalGroups: string[];

  @HostListener('mouseenter') onMouseEnter() {
    if (!this.finalGroups || this.finalGroups.length == 0) return;
    const highlightGroup = this.finalGroups[0];
    for (let e of HoverGroupElementRefs.getElements(highlightGroup)) {
      for (let v of e.hoverClass.split(' ')) {
        e.elementRef.nativeElement.classList.add(v);
      }
    }
  }

  @HostListener('mouseleave') onMouseLeave() {
    if (!this.finalGroups || this.finalGroups.length == 0) return;
    const highlightGroup = this.finalGroups[0];
    for (let e of HoverGroupElementRefs.getElements(highlightGroup)) {
      for (let v of e.hoverClass.split(' ')) {
        e.elementRef.nativeElement.classList.remove(v);
      }
    }
  }

  ngOnDestroy(): void {
    for (const g of this.finalGroups)
      HoverGroupElementRefs.removeElement(g, this);
  }

  ngOnInit(): void {
    if (!this.hoverGroup) this.finalGroups = ['dummy-group'];
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
