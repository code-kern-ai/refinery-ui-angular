import { interval, timer } from "rxjs";
import { SnakePlayer } from "./player";
import { Direction, oppositeDirection, Pos, randomDirection, randomIntFromInterval } from "./types";


export class SnakeBoard {
    public static boardSizes = [
        { name: 'medium (30x21)', width: 30, height: 21 },
        { name: 'small (11x8)', width: 11, height: 8 },
        { name: 'large (50x30)', width: 50, height: 30 },
    ];
    public static boardSpeed = [
        { name: 'regular', speed: .15 },
        { name: 'sleepy', speed: .5 },
        { name: 'slow', speed: .3 },
        { name: 'fast', speed: .05 },
        { name: 'insane', speed: .01 },
        { name: 'dynamic', speed: -1 },
    ];

    public width;
    public height;
    private speed;
    private currentSpeed;
    public players: SnakePlayer[] = [];
    public gameActive: boolean;
    private requestedDirection: number = -1;
    public applePos: Pos;
    private possiblePositions;
    public countDown: number = -1;

    constructor(boardSize: number, boardSpeed: number) {
        const size = SnakeBoard.boardSizes[boardSize];
        this.width = size.width;
        this.height = size.height;
        this.speed = SnakeBoard.boardSpeed[boardSpeed];
    }
    public initBoard() {
        this.possiblePositions = {};
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                let key = x + "_" + y;
                this.possiblePositions[key] = { x: x, y: y };
            }
        }

        this.initPlayer();
        this.newApple();
        this.startCountDown(3);
    }

    public requestHumanDirection(direction: Direction) {
        const human = this.players[0];
        if (direction == human.moveDirection) return;
        if (direction == oppositeDirection(human.moveDirection)) return;
        this.requestedDirection = direction;
    }

    private setHumanDirection() {
        if (this.requestedDirection == -1) return
        const human = this.players[0];
        if (this.requestedDirection != -1) this.players[0].moveDirection = this.requestedDirection;
        this.requestedDirection = -1;
    }

    private newApple() {
        const availablePos = { ...this.possiblePositions };
        for (const e of this.players) {
            let p = e.headPosition;
            delete availablePos[p.x + "_" + p.y];
            for (p of e.tail) delete availablePos[p.x + "_" + p.y];
        }

        const keys = Object.keys(availablePos);
        const i = randomIntFromInterval(0, Object.keys(availablePos).length - 1);

        this.applePos = availablePos[keys[i]];
    }

    private initPlayer(aiComponents: number = 0) {
        this.players = [];
        this.players.push(new SnakePlayer());
        // console.log("ai component not yet initialized");
        // for (let i = 0; i < aiComponents; i++) {
        //     this.players.push(new SnakePlayer());
        // }

        for (const e of this.players) {
            e.headPosition = this.getPlayerStartPos();
            for (let i = 0; i < 4; i++)e.tail.push({ x: e.headPosition.x, y: e.headPosition.y });
            e.calcOpacity();
            e.moveDirection = randomDirection();
        }
    }

    private getPlayerStartPos(): Pos {
        let pos = { x: randomIntFromInterval(0, this.width - 1), y: randomIntFromInterval(0, this.height - 1) };
        let taken = true;

        while (taken) {
            taken = false;
            for (const e of this.players) {
                if (e.headPosition && e.headPosition.x == pos.x && e.headPosition.y == pos.y) {
                    taken = true;
                    break;
                }
            }
            pos = { x: randomIntFromInterval(0, this.width), y: randomIntFromInterval(0, this.height) };
        }
        return pos;
    }

    private checkCollistion() {
        for (const e of this.players) {
            if (!e.isAlive) continue;
            for (const e2 of this.players) {
                if (!e2.isAlive) continue;
                if (e != e2 && e.headPosition.x == e2.headPosition.x && e.headPosition.y == e2.headPosition.y) {
                    e.isAlive = false;
                    e2.isAlive = false;
                    break;
                }
                for (const t of e2.tail) {
                    if (e.headPosition.x == t.x && e.headPosition.y == t.y) {
                        e.isAlive = false;
                        break;
                    }
                }
            }
        }
        let alive = 0;
        for (const e of this.players) {
            if (e.isAlive) alive++;
        }
        if (alive == 0) {
            console.log("game stopped")
            console.log("score:", this.players.map(p => p.tail.length - 4).join(", "))
            this.gameActive = false;
        }
    }

    private startCountDown(duration: number) {
        this.countDown = duration;
        console.log(this.countDown + "...");
        const x = interval(1000).subscribe(() => {
            this.countDown--;
            if (this.countDown > 0) console.log(this.countDown + "...");
            else {
                console.log("Go!!!!!");
                this.startGame();
                x.unsubscribe();
            }
        })
    }
    private startGame() {
        console.log("started");
        this.gameActive = true;
        this.currentSpeed = this.speed.speed;
        if (this.currentSpeed == -1) {
            this.currentSpeed = .35;
            const speedReducer = interval(60000).subscribe(() => {
                this.currentSpeed -= .01;
                console.log("reduced to " + this.currentSpeed);
                if (this.currentSpeed <= .01 || !this.gameActive) speedReducer.unsubscribe();
            })
        }

        timer(this.currentSpeed * 1000).subscribe(() => this.nextMove());

    }

    private nextMove() {
        this.setHumanDirection();
        for (const e of this.players) {
            e.movePlayer();
            e.wrapCheck(this.width, this.height);
        }
        this.checkCollistion();

        for (const e of this.players) {
            if (e.headPosition.x == this.applePos.x && e.headPosition.y == this.applePos.y) {
                console.log("found apple")
                const last = e.tail[e.tail.length - 1];
                e.tail.push({ x: last.x, y: last.y });
                e.calcOpacity();
                this.newApple();
                break;
            }
        }

        if (this.gameActive) {
            timer(this.currentSpeed * 1000).subscribe(() => this.nextMove());
        }

    }

}
