

export enum Direction {
    UP, RIGHT, DOWN, LEFT
}


export type Pos = {
    x: number
    y: number
}

export function oppositeDirection(direction: Direction): Direction {
    switch (direction) {
        case Direction.UP: return Direction.DOWN;
        case Direction.RIGHT: return Direction.LEFT;
        case Direction.DOWN: return Direction.UP;
        case Direction.LEFT: return Direction.RIGHT;
    }
}


export function randomIntFromInterval(min, max) { // min and max included 
    return Math.floor(Math.random() * (max - min + 1) + min)
}

export function randomDirection(): Direction {
    const v = randomIntFromInterval(0, 1000) % 4;
    switch (v) {
        case 0: return Direction.UP;
        case 1: return Direction.RIGHT;
        case 2: return Direction.DOWN;
        case 3: return Direction.LEFT;
        default:
            console.log("wrong direction")
            return Direction.UP;
    }
}
