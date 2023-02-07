import {
  Directive,
  HostListener,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';

enum InputParameter {
  HOVER_GROUP,
  HOVER_CLASS,
  HOVER_ADD_GROUP,
}

@Directive({
  selector: '[hover-group], [hover-group-class], [hover-add-group]'
})
export class HoverGroupDirective implements OnDestroy, OnChanges {
  constructor(public elementRef: ElementRef) { }

  //caution! the first group is the main groups and used to highlight corresponding elements
  //the other provided groups are only meant as additional highlight conditions
  //however if there are more groups needed for conditions but not containment use add-group


  @Input('hover-group') hoverGroup: any;
  @Input('hover-group-class') hoverClass: any;
  @Input('hover-add-group') addGroup: any;

  private finalGroups: string[];
  private finalAddGroups: string[];
  private finalClasses: string[];
  public static disableHover = false;

  @HostListener('mouseenter') onMouseEnter() {
    if (HoverGroupDirective.disableHover) return;
    this.loopGroups(this.finalGroups, true);
    this.loopGroups(this.finalAddGroups, true);
  }

  @HostListener('mouseleave') onMouseLeave() {
    if (HoverGroupDirective.disableHover) return;
    this.loopGroups(this.finalGroups, false);
    this.loopGroups(this.finalAddGroups, false);
  }

  private enterExitLogic(group: string, add: boolean) {
    const elements = HoverGroupElementRefs.getElements(group);
    if (!elements) return;
    for (let e of elements) {
      if (!e.finalClasses) continue;
      for (let v of e.finalClasses) {
        if (v) {
          if (add) e.elementRef.nativeElement.classList.add(v);
          else e.elementRef.nativeElement.classList.remove(v);
        }
      }
    }
  }

  private loopGroups(groupList: string[], add: boolean) {
    if (!groupList || groupList.length == 0) return;
    this.enterExitLogic(groupList[0], add);
  }

  ngOnDestroy(): void {
    this.loopGroups(this.finalGroups, false);
    this.removeExistingGroups();
  }

  private removeExistingGroups() {
    if (this.finalGroups) {
      for (const g of this.finalGroups)
        HoverGroupElementRefs.removeElement(g, this);
    }
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes.hoverGroup) this.initDataFor(InputParameter.HOVER_GROUP);
    if (changes.hoverClass) this.initDataFor(InputParameter.HOVER_CLASS);
    if (changes.addGroup) this.initDataFor(InputParameter.HOVER_ADD_GROUP);
  }
  private initDataFor(param: InputParameter) {
    if (param == InputParameter.HOVER_GROUP) {

      this.removeExistingGroups();
      if (!this.hoverGroup) this.finalGroups = ['dummy-group'];
      if (!Array.isArray(this.hoverGroup))
        this.finalGroups = this.hoverGroup.split(',').map((v) => v.trim());
      else this.finalGroups = this.hoverGroup;
      for (const g of this.finalGroups) HoverGroupElementRefs.push(g, this);
    }
    else if (param == InputParameter.HOVER_CLASS) {
      if (this.hoverClass) {
        if (!Array.isArray(this.hoverClass))
          this.finalClasses = this.hoverClass.split(' ').map((v) => v.trim());
        else this.finalClasses = this.hoverClass;
      }
    } else if (param == InputParameter.HOVER_ADD_GROUP) {
      if (this.addGroup) {
        if (!Array.isArray(this.addGroup))
          this.finalAddGroups = this.addGroup.split(',').map((v) => v.trim());
        else this.finalAddGroups = this.addGroup;
        //no need to push since they are not meant to be used like that
      }
    }
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
