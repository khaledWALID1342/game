import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js';

import { PointerLockControls }
from 'https://cdn.jsdelivr.net/npm/three@0.158/examples/jsm/controls/PointerLockControls.js';

import { CONFIG } from './config.js';

import { shootCurse } from './effects.js';



let scene, camera, renderer, controls;

let moveForward=false;
let moveBackward=false;
let moveLeft=false;
let moveRight=false;



init();
animate();




function init(){

scene = new THREE.Scene();

scene.background = new THREE.Color(0x000000);

camera = new THREE.PerspectiveCamera(

75,
window.innerWidth/window.innerHeight,
0.1,
1000

);



renderer = new THREE.WebGLRenderer({antialias:true});

renderer.setSize(window.innerWidth,window.innerHeight);

document.body.appendChild(renderer.domElement);




// light

const light = new THREE.PointLight(0xffffff,1);

light.position.set(10,10,10);

scene.add(light);



// floor

const floorGeo = new THREE.PlaneGeometry(100,100);

const floorMat = new THREE.MeshStandardMaterial({color:0x222222});

const floor = new THREE.Mesh(floorGeo,floorMat);

floor.rotation.x = -Math.PI/2;

scene.add(floor);




// controls

controls = new PointerLockControls(camera,document.body);

document.addEventListener('click',()=>{

controls.lock();

});

scene.add(controls.getObject());

camera.position.y=2;




// keys

document.addEventListener('keydown',(e)=>{

if(e.code=="KeyW")moveForward=true;
if(e.code=="KeyS")moveBackward=true;
if(e.code=="KeyA")moveLeft=true;
if(e.code=="KeyD")moveRight=true;

});



document.addEventListener('keyup',(e)=>{

if(e.code=="KeyW")moveForward=false;
if(e.code=="KeyS")moveBackward=false;
if(e.code=="KeyA")moveLeft=false;
if(e.code=="KeyD")moveRight=false;

});



// shoot

document.addEventListener('mousedown',()=>{

shootCurse(scene,camera);

});

}



function animate(){

requestAnimationFrame(animate);




if(moveForward)controls.moveForward(CONFIG.playerSpeed);

if(moveBackward)controls.moveForward(-CONFIG.playerSpeed);

if(moveLeft)controls.moveRight(-CONFIG.playerSpeed);

if(moveRight)controls.moveRight(CONFIG.playerSpeed);




renderer.render(scene,camera);

}
