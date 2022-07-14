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
  constructor(public elementRef: ElementRef) {}

  @Input('hover-group') hoverGroup: any;
  @Input('hover-group-class') hoverClass: any;

  @HostListener('mouseenter') onMouseEnter() {
    for (let e of HoverGroupElementRefs.getElements(this.hoverGroup)) {
      for (let v of e.hoverClass.split(' ')) {
        e.elementRef.nativeElement.classList.add(v);
      }
    }
  }

  @HostListener('mouseleave') onMouseLeave() {
    for (let e of HoverGroupElementRefs.getElements(this.hoverGroup)) {
      for (let v of e.hoverClass.split(' ')) {
        e.elementRef.nativeElement.classList.remove(v);
      }
    }
  }

  ngOnDestroy(): void {
    HoverGroupElementRefs.removeElement(this.hoverGroup, this);
  }

  ngOnInit(): void {
    if (!this.hoverGroup) this.hoverGroup = 'dummy-group';
    HoverGroupElementRefs.push(this.hoverGroup, this);
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
