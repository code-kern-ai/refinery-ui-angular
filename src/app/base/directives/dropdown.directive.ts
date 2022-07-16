
import { Directive, ElementRef, EventEmitter, HostListener, Output } from '@angular/core';

@Directive({
  selector: '[appDropdown]'
})
export class DropdownDirective {
  @Output() isMenuOpen = new EventEmitter<boolean>();
  isOpen: boolean = false;

  constructor(private elemRef: ElementRef) { }

  @HostListener('click') toggleMenu() {
    this.isOpen = !this.isOpen;
    this.isMenuOpen.emit(this.isOpen);
  }

  @HostListener('document:click', ['$event'])
  @HostListener('document:touchstart', ['$event']) close() {
    if (!this.elemRef.nativeElement.contains(event.target)) {
      this.isOpen = false;
      this.isMenuOpen.emit(this.isOpen);
    }
  }
}