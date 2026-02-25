import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js';

export function shootCurse(scene,camera){

const geo = new THREE.SphereGeometry(0.2);

const mat = new THREE.MeshBasicMaterial({

color:0x00ffff

});

const bullet = new THREE.Mesh(geo,mat);

bullet.position.copy(camera.position);

scene.add(bullet);



const direction = new THREE.Vector3();

camera.getWorldDirection(direction);



function move(){

bullet.position.add(direction.multiplyScalar(0.5));

requestAnimationFrame(move);

}

move();

}
