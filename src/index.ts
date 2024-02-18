// function redDot(cords:number[]) {
//     main.ctx.fillStyle = 'red';
//     main.ctx.beginPath();
//     main.ctx.arc(cords[0], cords[1], 3, 0, 2 * Math.PI, false);
//     main.ctx.fill();
//     main.ctx.closePath();
// }

function createFog() {
    let w = window.innerWidth;
    let h = window.innerHeight;

    let outerRadius = w * .75;
    let innerRadius = w * .2;

    let fogCanvas = document.createElement('canvas');
    let ctx = fogCanvas.getContext('2d')!;
    let grd = ctx.createRadialGradient(w / 2, h / 2, innerRadius, w / 2, h / 2, outerRadius);

    fogCanvas.width = window.innerWidth;
    fogCanvas.height = window.innerHeight;

    grd.addColorStop(0, 'rgba(0,0,0,0)');
    grd.addColorStop(1, 'rgba(0,0,0,' + .25 + ')');
    ctx.fillStyle = grd;
    ctx.fillRect(0,0,window.innerWidth,window.innerHeight);

    return fogCanvas;
}

class Player {
    static radius:number = 25;
    static sqrRadius:number = Player.radius**2;

    constructor(public ctx:CanvasRenderingContext2D, public team:string = "grey") {}

    hp:number = 100;

    // Координаты на карте
    x:number = 2500;
    y:number = 2500;

    // Скорость
    vx:number = 0;
    vy:number = 0;

    // Максимальная скорость
    mv:number = 17;

    // Максимальная диагональная скорость
    mdv:number = this.mv/Math.sqrt(2);

    keyPressed:{[key:string]: boolean} = {
        "ArrowRight": false,
        "ArrowLeft": false,
        "ArrowUp": false,
        "ArrowDown": false,
        "ShiftLeft": false
    }

    draw() {
        let center = camera.center

        main.ctx.beginPath();
        main.ctx.arc(center[0], center[1], Player.radius*camera.scale, 0, 2 * Math.PI, false);
        main.ctx.fillStyle = 'white';
        main.ctx.fill();

        let tg = (mouse.y-center[1])/(mouse.x-center[0])
        let atg = Math.atan(tg);

        console.log(atg)

        if(mouse.x-center[0] < 0) atg += Math.PI

        main.ctx.beginPath();
        main.ctx.arc(center[0], center[1], 13 * camera.scale, 0, 2 * Math.PI, false);
        main.ctx.fillStyle = this.team;
        main.ctx.fill();
        main.ctx.closePath();

        main.ctx.strokeStyle = this.team;
        main.ctx.lineWidth = 15*camera.scale;

        main.ctx.beginPath();
        main.ctx.moveTo(center[0], center[1]);
        main.ctx.lineTo(center[0] + Math.cos(atg) * 2 * 10 * camera.scale, center[1] + Math.sin(atg) * 2 * 10 * camera.scale);
        main.ctx.stroke();
        main.ctx.closePath();
    }

    move(walls:Wall[]) {
        if(this.keyPressed.ArrowUp) this.vy-=3;
        if(this.keyPressed.ArrowDown) this.vy+=3;
        if(this.keyPressed.ArrowLeft) this.vx-=3;
        if(this.keyPressed.ArrowRight) this.vx+=3;

        if(!this.vx && !this.vy) return;

        this.vy = this.vy > this.mv ? this.mv : this.vy;
        this.vy = this.vy < -this.mv ? -this.mv : this.vy;
        this.vx = this.vx > this.mv ? this.mv : this.vx;
        this.vx = this.vx < -this.mv ? -this.mv : this.vx;

        // Проверка диагональной скорости

        // let diagonalSpeed = Math.sqrt(this.vy**2+this.vx**2);

        // if (diagonalSpeed > this.mv) {
        //     this.vx = (this.vx/Math.abs(this.vx)) * this.mdv;
        //     this.vy = (this.vy/Math.abs(this.vy)) * this.mdv;
        // }

        // Коллизия
        walls
        // .filter(wall => wall.)
        .forEach(wall => {
            let distance = wall.sqrDistance(this.x, this.y);
            let futureDistanceX = wall.sqrDistance(this.x+this.vx, this.y);
            let futureDistanceY = wall.sqrDistance(this.x, this.y+this.vy);

            if(futureDistanceX < Player.sqrRadius) this.vx = (this.vx > 0 ? 1 : -1) * (Math.sqrt(distance) - Player.radius);
            if(futureDistanceY < Player.sqrRadius) this.vy = (this.vy > 0 ? 1 : -1) * (Math.sqrt(distance) - Player.radius);
        });

        this.x += this.vx;
        this.y += this.vy;
        
        if(!this.keyPressed["ArrowRight"] && !this.keyPressed["ArrowLeft"]) this.vx*=0.8;
        if(!this.keyPressed["ArrowUp"] && !this.keyPressed["ArrowDown"]) this.vy*=0.8;
        
        if(Math.abs(this.vx) < 0.3) this.vx = 0;
        if(Math.abs(this.vy) < 0.3) this.vy = 0;
    }
}

class Wall {
    constructor(public x:number, public y:number, public w:number, public h:number, public color:string = "white") {}

    draw() {
        let translatedCords = camera.translateCords(this.x, this.y);

        main.ctx.fillStyle = this.color;
        main.ctx.fillRect(translatedCords[0], translatedCords[1], this.w*camera.scale, this.h*camera.scale);
    }

    sqrDistance(x:number,y:number) {
        let dotCords = [
            Math.max(this.x, Math.min(x, this.x + this.w)),
            Math.max(this.y, Math.min(y, this.y + this.h))
        ];
        
        return (x - dotCords[0]) ** 2 + (y - dotCords[1]) ** 2;
    }
}

class WorldMap {
    constructor(public walls:Wall[], w:number = 5000, h:number = 5000, t:number = 5) {
        
        // Мировые стены
        this.walls.push(
            new Wall(-t,-t,w+t*2,t, "green"),
            new Wall(-t,h,w+t*2,t, "green"),
            new Wall(-t,0,t,h, "green"),
            new Wall(w,0,t,h, "green"),
        )
    }
}

let times:number[] = [];
let fps:number = 0;

class Main {
    canvas:HTMLCanvasElement;
    ctx:CanvasRenderingContext2D;
    players:Player[] = [];
    walls:Wall[] = [];

    fog = createFog();

    constructor(world:WorldMap) {
        this.canvas = <HTMLCanvasElement> document.getElementById("canvas");
        this.ctx = this.canvas.getContext("2d")!;

        this.ctx.canvas.width  = window.innerWidth;
        this.ctx.canvas.height = window.innerHeight;

        this.players.push(new Player(this.ctx));
        this.walls = world.walls;
    }

    update() {
        this.ctx.clearRect(0,0,window.innerWidth,window.innerHeight);

        this.players.forEach(player => {
            player.move(this.walls);
            player.draw();
        });

        this.walls.forEach((wall) => {
            wall.draw();
        });

        this.ctx.drawImage(this.fog, 0, 0);

        let fontSize = 14 * camera.scale
        
        this.ctx.font = `${fontSize}px serif`;
        this.ctx.fillStyle = "white"
        this.ctx.fillText(`x:   ${main.players[0].x.toFixed(2)}`, 10, fontSize);
        this.ctx.fillText(`y:   ${main.players[0].y.toFixed(2)}`, 10, fontSize*2);
        this.ctx.fillText(`vx:  ${main.players[0].vx.toFixed(2)}`, 10, fontSize*3);
        this.ctx.fillText(`vy:  ${main.players[0].vy.toFixed(2)}`, 10, fontSize*4);
        this.ctx.fillText(`fps: ${fps.toFixed(2)}`, 10, fontSize*5);

        const now = performance.now();

        while (times.length > 0 && times[0] <= now - 1000) {
            times.shift();
        }
        times.push(now);
        fps = times.length;

        requestAnimationFrame(this.update.bind(this));
    }
}

class Camera {
    scale = this.getScale();
    center = this.getCenter();

    getScale() {
        return Math.max(window.innerWidth, window.innerHeight)/1000
    }

    getCenter() {
        // let mainPlayer = main.players[0];

        return [
            window.innerWidth/2 - ((mouse.x * 100 * this.scale)/(window.innerWidth/2)) + (100 * this.scale), // + (mainPlayer.vx * this.scale * 1.5),
            window.innerHeight/2 - ((mouse.y * 100 * this.scale)/(window.innerHeight/2)) + (100 * this.scale) // + (mainPlayer.vy * this.scale * 1.5)
        ];
    }

    /**
     * Переводит координаты из абсолютных в координаты на canvas
     */
    translateCords(x:number,y:number) {
        let player = main.players[0];
        let center = this.center;

        return [(x-player.x)*this.scale+center[0], (y-player.y)*this.scale+center[1]];
    }
}

const keys = ["ArrowUp", "ArrowLeft", "ArrowDown" , "ArrowRight", "ShiftLeft"];
const alterKeys = ["KeyW", "KeyA", "KeyS", "KeyD", "ShiftRight"];

let main:Main;
let world = new WorldMap([new Wall(2519, 2584, 1000, 500)], 5000, 5000, 15);
let mouse = {x: 0, y: 0};
let camera:Camera;

document.addEventListener("DOMContentLoaded", function () {
    main = new Main(world);
    camera = new Camera();

    main.update();
});

document.addEventListener('keydown', function(e) {
    if(keys.includes(e.code)) main.players[0].keyPressed[e.key] = true;
    if(alterKeys.includes(e.code)) main.players[0].keyPressed[keys[alterKeys.indexOf(e.code)]] = true;
});

document.addEventListener('keyup', function(e) {
    if(keys.includes(e.code)) main.players[0].keyPressed[e.key] = false;
    if(alterKeys.includes(e.code)) main.players[0].keyPressed[keys[alterKeys.indexOf(e.code)]] = false;
});

document.addEventListener("mousemove", function (e) {
    mouse = {
        x: e.clientX,
        y: e.clientY
    }

    camera.center = camera.getCenter();
}, false);

window.addEventListener("resize", () => {
    main.ctx.canvas.width  = window.innerWidth;
    main.ctx.canvas.height = window.innerHeight;

    camera.scale = camera.getScale();
    camera.center = camera.getCenter();

    main.fog = createFog();
}, true);