// function redDot(cords:number[]) {
//     main.ctx.fillStyle = 'red';
//     main.ctx.beginPath();
//     main.ctx.arc(cords[0], cords[1], 3, 0, 2 * Math.PI, false);
//     main.ctx.fill();
//     main.ctx.closePath();
// }

type TeamColor = {'skin': string, 'bullets': string};

const TEAMS:{[key:string]:TeamColor} = {
    'player': {
        'skin': "grey",
        'bullets': "#000000"
    },
    'enemy': {
        'skin': "red",
        'bullets': "#FF0000"
    }
}

class Vector {
    constructor(public module:number, public angle:number) {}

    // constructor(module, angle) {
    //     this.module = module;
    //     this.angle = angle;
    // }

    getCords() {
        return [this.module*Math.cos(this.angle), this.module*Math.sin(this.angle)];
    }

    plus(vec:Vector) {
        let curVecCords = this.getCords();
        let plusVecCords = vec.getCords();

        return Vector.cordsToVector([curVecCords[0]+plusVecCords[0], curVecCords[1]+plusVecCords[1]]); // out;
    }

    /**
     * Скалярное произведение
     */
    mult(vec:Vector) {
        let curVecCords = this.getCords();
        let plusVecCords = vec.getCords();

        return curVecCords[0]*plusVecCords[0] + curVecCords[1]*plusVecCords[1]
    }

    /**
     * Преобразует координаты в вектор
     */
    static cordsToVector(cords:number[]) {
        let module = Math.sqrt(cords[0]**2 + cords[1]**2);
        let angle  = Math.atan2(cords[1], cords[0]);

        // console.log(cords, module, angle);

        return new Vector(module, angle);
    }
}

abstract class Unite {
    removed:boolean = false;

    abstract draw():void;
    abstract move():void;
    abstract sqrDistance(x:number,y:number):number;
    abstract collision(player:Player):void;
}

class Player {
    static radius:number = 25;
    static sqrRadius:number = Player.radius**2;

    constructor(public team:string = "player") {}

    hp:number = 100;

    // Координаты на карте
    x:number = 2500;
    y:number = 2500;

    // Вектор скорости
    speedVector:Vector = new Vector(0,0);

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

        let atg = Math.atan2(mouse.y-center[1], mouse.x-center[0]);

        main.ctx.fillStyle    = TEAMS[this.team].skin;
        main.ctx.strokeStyle  = TEAMS[this.team].skin;

        main.ctx.beginPath();
        main.ctx.arc(center[0], center[1], 13 * camera.scale, 0, 2 * Math.PI, false);
        main.ctx.fill();
        main.ctx.closePath();

        main.ctx.lineWidth = 15 * camera.scale;

        main.ctx.beginPath();
        main.ctx.moveTo(center[0], center[1]);
        main.ctx.lineTo(center[0] + Math.cos(atg) * 20 * camera.scale, center[1] + Math.sin(atg) * 20 * camera.scale);
        main.ctx.stroke();
        main.ctx.closePath();
    }

    move() {
        // Ускорение
        let a = 3;

        if(this.keyPressed.ArrowUp) this.speedVector = this.speedVector.plus(new Vector(a, -Math.PI/2));
        if(this.keyPressed.ArrowDown) this.speedVector = this.speedVector.plus(new Vector(a, Math.PI/2));
        if(this.keyPressed.ArrowLeft) this.speedVector = this.speedVector.plus(new Vector(a, Math.PI));
        if(this.keyPressed.ArrowRight) this.speedVector = this.speedVector.plus(new Vector(a, 0));

        if(this.speedVector.module == 0) return;
        if(this.speedVector.module > this.mv) this.speedVector.module = this.mv;

        let cords = this.speedVector.getCords();

        main.walls.forEach((wall) => {
            let futureDistance = wall.sqrDistance(this.x+cords[0], this.y+cords[1]);

            if(futureDistance < Player.sqrRadius) {
                let distance = wall.sqrDistance(this.x, this.y);
                let fnd = wall.nearDot(this.x+cords[0], this.y+cords[1]);
                let angle = Math.atan2(this.y + cords[1] - fnd[1], this.x + cords[0] - fnd[0]);
                let p = new Vector(Math.sqrt(distance)-Math.sqrt(futureDistance), angle);

                this.speedVector = this.speedVector.plus(p);

                cords = this.speedVector.getCords();
            }
        });

        cords = this.speedVector.getCords();

        this.x += cords[0];
        this.y += cords[1];

        if(!(this.keyPressed.ArrowUp || this.keyPressed.ArrowDown)) this.speedVector = Vector.cordsToVector([cords[0], cords[1]*0.75]);
        
        if(!(this.keyPressed.ArrowLeft || this.keyPressed.ArrowRight)) {
            cords = this.speedVector.getCords();

            this.speedVector = Vector.cordsToVector([cords[0]*0.75, cords[1]]);
        }

        // if(!(this.keyPressed.ArrowUp || this.keyPressed.ArrowDown || this.keyPressed.ArrowLeft || this.keyPressed.ArrowRight)) this.speedVector.module*=0.75;
        if(this.speedVector.module<0.3) this.speedVector.module = 0;
    }

    shot() {
        let center = camera.center;
        let atg = Math.atan2(mouse.y-center[1], mouse.x-center[0]);

        let bullet = new Bullet(this.x, this.y, 30, atg);

        main.units.push(bullet);
    }
}

class Wall {
    constructor(public x:number, public y:number, public w:number, public h:number, public color:string = "white") {}

    draw() {
        let translatedCords = camera.translateCords(this.x, this.y);

        main.ctx.fillStyle = this.color;
        main.ctx.fillRect(translatedCords[0], translatedCords[1], this.w*camera.scale, this.h*camera.scale);
    }

    nearDot(x:number,y:number) {
        let cords = [
            Math.max(this.x, Math.min(x, this.x + this.w)),
            Math.max(this.y, Math.min(y, this.y + this.h))
        ]

        //redDot(camera.translateCords(cords[0], cords[1]));

        return cords;
    }

    sqrDistance(x:number,y:number) {
        let dotCords = this.nearDot(x,y);
        
        return (x - dotCords[0]) ** 2 + (y - dotCords[1]) ** 2;
    }
}

class Bullet extends Unite {
    size:number = 10;
    sqrSize:number = this.size**2;
    color:string = "#FF0000FF";
    damage:number = 15;
    speedVector:Vector;

    constructor(public x:number, public y:number, v:number, angle:number, public team:string = 'player') {
        super();

        this.speedVector = new Vector(v, angle);
    }

    draw(): void {
        let translatedCords = camera.translateCords(this.x, this.y);

        main.ctx.fillStyle = this.color;
        main.ctx.beginPath();
        main.ctx.arc(translatedCords[0], translatedCords[1], this.size*camera.scale, 0, 2 * Math.PI, false);
        main.ctx.fill();
        main.ctx.closePath();
    }

    move(): void {
        if(this.speedVector.module < 0.3) return this.remove();

        let cords = this.speedVector.getCords();

        main.walls.forEach((wall) => {
            let futureDistance = wall.sqrDistance(this.x+cords[0], this.y+cords[1]);

            if(futureDistance < this.sqrSize) {
                let distance = wall.sqrDistance(this.x, this.y);

                // console.log(Math.sqrt(distance)-this.size);

                let fnd = wall.nearDot(this.x+cords[0], this.y+cords[1]);
                let angle = Math.atan2(this.y + cords[1] - fnd[1], this.x + cords[0] - fnd[0]);
                let p = new Vector(Math.sqrt(distance)-Math.sqrt(futureDistance), angle);

                console.log(Math.sqrt(distance)-Math.sqrt(futureDistance))

                this.speedVector = this.speedVector.plus(p);

                cords = this.speedVector.getCords();

                this.x += cords[0];
                this.y += cords[1];

                this.speedVector = new Vector(0,0);
                this.remove();

                cords = this.speedVector.getCords();
            }
        });
        
        cords = this.speedVector.getCords();

        this.x += cords[0];
        this.y += cords[1];

        this.speedVector.module*=0.95;

        // this.x += this.v * Math.cos(this.angle);
        // this.y += this.v * Math.sin(this.angle);
    }

    sqrDistance(x: number, y: number): number {
        return (x - this.x) ** 2 + (y - this.y) ** 2 - this.size**2 - Player.radius**2;
    }

    remove() {
        let transparency = 255;

        const animation = setInterval((function (scope) {
            return function() {
                transparency-=3;
                scope.size += 0.03;

                const hex = transparency.toString(16);
                scope.color = scope.color.substring(0,scope.color.length-2) + (hex.length == 1 ? "0" : "") + hex;
                
                if(transparency <= 0) {
                    clearInterval(animation);
                    scope.removed = true;
                }
            }
        })(this), 1);
    }
    
    collision(player: Player): void {
        player.hp -= this.damage;
        this.damage = 0;

        this.remove();
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

class Main {
    // Элемент
    canvas:HTMLCanvasElement;

    // Контекст
    ctx:CanvasRenderingContext2D;

    // Объекты
    player:Player    = new Player();
    walls:Wall[]     = [];
    units:Unite[]    = [];

    // Для определения fps
    times:number[] = [];
    fps:number = 0;

    // Виньетка
    fog:HTMLCanvasElement = this.createFog();

    constructor(world:WorldMap) {
        this.canvas = <HTMLCanvasElement> document.getElementById("canvas");
        this.ctx = this.canvas.getContext("2d")!;

        this.ctx.canvas.width  = window.innerWidth;
        this.ctx.canvas.height = window.innerHeight;

        // this.players.push(new Player());
        this.walls.push(...world.walls)
    }

    createFog() {
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

    update() {
        this.ctx.clearRect(0,0,window.innerWidth,window.innerHeight);

        // this.players.forEach(player => {
        //     player.move();
        //     player.draw();
        // });

        this.player.move();
        this.player.draw();

        this.units.forEach((unit, i) => {
            if(unit.removed) this.units.splice(i, 1);

            unit.move();
            unit.draw();
        });

        this.walls.forEach((wall) => {
            wall.draw();
        })

        this.ctx.drawImage(this.fog, 0, 0);

        let fontSize = 14 * camera.scale
        
        this.ctx.font = `${fontSize}px serif`;
        this.ctx.fillStyle = "white"
        this.ctx.fillText(`x:   ${main.player.x.toFixed(2)}`, 10, fontSize);
        this.ctx.fillText(`y:   ${main.player.y.toFixed(2)}`, 10, fontSize*2);
        this.ctx.fillText(`v:   ${main.player.speedVector.module.toFixed(2)}`, 10, fontSize*3);
        this.ctx.fillText(`fps: ${this.fps.toFixed(0)}`, 10, fontSize*4);
        this.ctx.fillText(`hp:  ${main.player.hp.toFixed(2)}`, 10, fontSize*5);

        const now = performance.now();

        while (this.times.length > 0 && this.times[0] <= now - 1000) {
            this.times.shift();
        }
        this.times.push(now);
        this.fps = this.times.length;

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
        // let mainPlayer = main.player;

        return [
            window.innerWidth/2 - ((mouse.x * 100 * this.scale)/(window.innerWidth/2)) + (100 * this.scale), // + (mainPlayer.vx * this.scale * 1.5),
            window.innerHeight/2 - ((mouse.y * 100 * this.scale)/(window.innerHeight/2)) + (100 * this.scale) // + (mainPlayer.vy * this.scale * 1.5)
        ];
    }

    /**
     * Переводит координаты из абсолютных в координаты на canvas
     */
    translateCords(x:number,y:number) {
        let player = main.player;
        let center = this.center;

        return [(x-player.x)*this.scale+center[0], (y-player.y)*this.scale+center[1]];
    }
}

const keys = ["ArrowUp", "ArrowLeft", "ArrowDown" , "ArrowRight", "ShiftLeft"];
const alterKeys = ["KeyW", "KeyA", "KeyS", "KeyD", "ShiftRight"];

let main:Main;
let world = new WorldMap([new Wall(2500 + Player.radius, 2584, 1000, 500)], 5000, 5000, 15);
let mouse = { x: 0, y: 0 };
let camera:Camera;

document.addEventListener("DOMContentLoaded", function () {
    main = new Main(world);
    camera = new Camera();

    main.update();
});

document.addEventListener('keydown', function(e) {
    if(keys.includes(e.code)) main.player.keyPressed[e.key] = true;
    if(alterKeys.includes(e.code)) main.player.keyPressed[keys[alterKeys.indexOf(e.code)]] = true;
});

document.addEventListener('keyup', function(e) {
    if(keys.includes(e.code)) main.player.keyPressed[e.key] = false;
    if(alterKeys.includes(e.code)) main.player.keyPressed[keys[alterKeys.indexOf(e.code)]] = false;
});

document.addEventListener("mousemove", function (e) {
    mouse = { x: e.clientX, y: e.clientY }

    camera.center = camera.getCenter();
}, false);

document.addEventListener("mousedown", function (e) {
    mouse = { x: e.clientX, y: e.clientY }

    camera.center = camera.getCenter();

    main.player.shot();
});

window.addEventListener("resize", () => {
    main.ctx.canvas.width  = window.innerWidth;
    main.ctx.canvas.height = window.innerHeight;

    camera.scale = camera.getScale();
    camera.center = camera.getCenter();

    main.fog = main.createFog();
}, true);