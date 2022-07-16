import { Direction, Pos } from "./types";

export class SnakePlayer {

    public headPosition: Pos;
    public moveDirection: Direction;
    public tail: Pos[] = [];
    public opacity: number[] = [];
    public isAlive: boolean = true;
    public color: string = "#75ea8e"

    public movePlayer() {
        if (!this.headPosition || !this.tail) {
            console.log("something up with player move", this.headPosition, this.tail, this.moveDirection);
            return;
        }
        for (let i = this.tail.length; i--; i == 0) {
            if (i == 0) {
                this.tail[0] = this.headPosition;
            } else {
                this.tail[i] = this.tail[i - 1];
            }
        }
        this.headPosition = this.getNewHeadPos();

    }
    public calcOpacity() {
        const step = 0.5 / this.tail.length;
        this.opacity = [];
        for (let i = 0; i < this.tail.length; i++) {
            this.opacity.push(1 - (i + 1) * step);
        }
    }
    public wrapCheck(maxX: number, maxY: number) {
        if (this.headPosition.x >= maxX) this.headPosition.x = 0;
        else if (this.headPosition.x < 0) this.headPosition.x = maxX - 1;
        else if (this.headPosition.y >= maxY) this.headPosition.y = 0;
        else if (this.headPosition.y < 0) this.headPosition.y = maxY - 1;
    }

    private getNewHeadPos(): Pos {
        let newPos = { x: this.headPosition.x, y: this.headPosition.y };
        switch (this.moveDirection) {
            case Direction.UP: newPos.y--; break;
            case Direction.RIGHT: newPos.x++; break;
            case Direction.DOWN: newPos.y++; break;
            case Direction.LEFT: newPos.x--; break;
        }
        return newPos;
    }
}
