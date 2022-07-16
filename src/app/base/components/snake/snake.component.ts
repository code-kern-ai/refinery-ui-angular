import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { SnakeBoard } from './helper-classes/board';
import { Direction } from './helper-classes/types';

@Component({
  selector: 'kern-snake',
  templateUrl: './snake.component.html',
  styleUrls: ['./snake.component.scss'],
})
export class SnakeComponent implements OnInit {
  menuActive: boolean = false;

  @ViewChild('gameBoard', { read: ElementRef }) gameBoard: ElementRef;

  boardSizes = SnakeBoard.boardSizes;
  boardSpeed = SnakeBoard.boardSpeed;

  snakeBoard: SnakeBoard;

  blockPixelSize: number;
  rows: any[];
  cols: any[];
  heightBigger: boolean;

  constructor() { }


  ngOnInit(): void {
    this.initGameMenu();
  }

  initGameMenu() {
    this.menuActive = true;
  }

  startGame(size: number, speed: number) {
    this.menuActive = false;
    this.snakeBoard = new SnakeBoard(size, speed);
    this.snakeBoard.initBoard();
    this.calcBlockSize();
  }

  calcBlockSize() {
    const baseBound: DOMRect = this.gameBoard.nativeElement.getBoundingClientRect();

    const width = baseBound.width / this.snakeBoard.width;
    const height = baseBound.height / this.snakeBoard.height;

    this.heightBigger = width < height;
    if (this.heightBigger) this.blockPixelSize = Math.floor(width) - 2;
    else this.blockPixelSize = Math.floor(height) - 2;
    this.rows = new Array(this.snakeBoard.height);
    this.cols = new Array(this.snakeBoard.width);
  }


  @HostListener('window:keydown', ['$event'])
  keyEvent(event: KeyboardEvent) {
    if (!this.snakeBoard || !this.snakeBoard.gameActive) return;

    if (event.key == 'ArrowRight') this.snakeBoard.requestHumanDirection(Direction.RIGHT);
    else if (event.key == 'ArrowLeft') this.snakeBoard.requestHumanDirection(Direction.LEFT);
    else if (event.key == 'ArrowUp') this.snakeBoard.requestHumanDirection(Direction.UP);
    else if (event.key == 'ArrowDown') this.snakeBoard.requestHumanDirection(Direction.DOWN);

  }

}
