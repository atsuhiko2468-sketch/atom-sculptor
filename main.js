import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
// 分割したui.jsから関数を読み込む！
import { createUIPanel } from './ui.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x04040a); 
scene.fog = new THREE.Fog(0x04040a, 5, 40);

const playerRig = new THREE.Group();
scene.add(playerRig);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
playerRig.add(camera);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

const p1 = new THREE.PointLight(0xff00ff, 2, 10); p1.position.set(2, 2, 0);
const p2 = new THREE.PointLight(0x00ffff, 2, 10); p2.position.set(-2, 2, 0);
playerRig.add(p1, p2, new THREE.AmbientLight(0x333333));

// --- 状態管理 ---
let GAME_STATE = 'START'; 
let strokeHistory = []; 
let dashVelocity = new THREE.Vector3();
const WEAPON_RADIUS = 0.015;
let startTime = 0;
let clearTime = 0;

// ★外部ファイル(ui.js)の関数を使ってパネルを作る
let currentUIPanel = createUIPanel('START');
currentUIPanel.position.set(0, 1.5, -3);
scene.add(currentUIPanel);

// --- 巨大ボス ---
const bossGroup = new THREE.Group();
bossGroup.position.set(0, 8, -25); 
scene.add(bossGroup);
bossGroup.visible = false;

const coreGeo = new THREE.OctahedronGeometry(1.5, 2);
const bossCore = new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true }));
bossGroup.add(bossCore);

let armorPieces = [];
const particles = [];

function initBoss() {
    armorPieces.forEach(a => bossGroup.remove(a));
    armorPieces = [];
    bossCore.visible = true;
    bossGroup.visible = true;
    bossGroup.position.set(0, 8, -25);
    playerRig.position.set(0,0,0);

    const armorGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    for(let i = 0; i < 150; i++) {
        const mat = new THREE.MeshBasicMaterial({ color: Math.random() > 0.5 ? 0x00ffff : 0xff00ff, wireframe: true });
        const armor = new THREE.Mesh(armorGeo, mat);
        const radius = 2.0 + Math.random() * 3.0;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        armor.position.set(radius * Math.sin(phi) * Math.cos(theta), radius * Math.sin(phi) * Math.sin(theta), radius * Math.cos(phi));
        armor.userData = { isDead: false, axis: new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).normalize(), speed: 0.01 + Math.random() * 0.02 };
        bossGroup.add(armor);
        armorPieces.push(armor);
    }
}

function shatterArmor(armor) {
    armor.userData.isDead = true; armor.visible = false;
    for(let i=0; i<4; i++) {
        const p = new THREE.Mesh(new THREE.BoxGeometry(0.1,0.1,0.1), new THREE.MeshBasicMaterial({color: armor.material.color}));
        const worldPos = new THREE.Vector3(); armor.getWorldPosition(worldPos);
        p.position.copy(worldPos);
        p.userData = { velocity: new THREE.Vector3((Math.random()-0.5)*0.3, (Math.random()-0.5)*0.3, (Math.random()-0.5)*0.3), life: 1.0 };
        scene.add(p); particles.push(p);
    }
}

// --- ゲームループ制御 ---
let resultGallery = null;

function startGame() {
    if(currentUIPanel) { 
        scene.remove(currentUIPanel); 
        currentUIPanel.material.map.dispose();
        currentUIPanel.material.dispose();
        currentUIPanel.geometry.dispose();
        currentUIPanel = null; 
    }
    if(resultGallery) { scene.remove(resultGallery); resultGallery = null; }
    
    strokeHistory = [];
    particles.forEach(p => scene.remove(p));
    particles.length = 0;

    initBoss();
    startTime = clock.getElapsedTime();
    GAME_STATE = 'PLAYING';
    
    h1.laser.visible = false; h1.tipCursor.visible = false;
    h2.laser.visible = false; h2.tipCursor.visible = false;
}

function triggerResult() {
    if (GAME_STATE === 'RESULT') return; 

    GAME_STATE = 'RESULT';
    clearTime = (clock.getElapsedTime() - startTime).toFixed(1);
    bossGroup.visible = false;

    let rank = 'C';
    if(clearTime < 30) rank = 'S';
    else if(clearTime < 60) rank = 'A';
    else if(clearTime < 90) rank = 'B';

    const corePos = new THREE.Vector3(); bossCore.getWorldPosition(corePos);
    for(let i=0; i<50; i++) {
        const p = new THREE.Mesh(new THREE.BoxGeometry(0.2,0.2,0.2), new THREE.MeshBasicMaterial({color: 0xffffff}));
        p.position.copy(corePos);
        p.userData = { velocity: new THREE.Vector3((Math.random()-0.5)*1.5, (Math.random()-0.5)*1.5, (Math.random()-0.5)*1.5), life: 1.0 };
        scene.add(p); particles.push(p);
    }

    resultGallery = new THREE.Group();
    resultGallery.position.set(playerRig.position.x, playerRig.position.y + 1.5, playerRig.position.z - 1.5);
    strokeHistory.forEach((pts, index) => {
        if(pts.length > 1) {
            const center = pts[0].clone();
            const localPts = pts.map(p => p.clone().sub(center).multiplyScalar(0.1));
            const mesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(localPts), localPts.length, 0.005, 5, false), new THREE.MeshBasicMaterial({ color: index % 2 === 0 ? 0x00ffff : 0xff00ff, wireframe: true }));
            mesh.position.set((Math.random()-0.5)*1.0, (Math.random()-0.5)*1.0, (Math.random()-0.5)*1.0);
            resultGallery.add(mesh);
        }
    });
    scene.add(resultGallery);

    // ★外部ファイル(ui.js)の関数を使ってリザルトパネルを作る
    currentUIPanel = createUIPanel('RESULT', { time: clearTime, rank: rank });
    currentUIPanel.position.set(playerRig.position.x, playerRig.position.y + 1.5, playerRig.position.z - 2);
    currentUIPanel.lookAt(playerRig.position.x, playerRig.position.y + 1.5, playerRig.position.z);
    scene.add(currentUIPanel);

    h1.laser.visible = true; h2.laser.visible = true;
}

// --- コントローラーとRaycaster ---
const raycaster = new THREE.Raycaster();

function setupController(index, colorHex) {
    const controller = renderer.xr.getController(index);
    playerRig.add(controller);

    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    tip.position.z = -0.05;
    controller.add(tip);

    const laserGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-10)]);
    const laser = new THREE.Line(laserGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
    controller.add(laser);

    const tipCursor = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false }));
    tipCursor.visible = false;
    controller.add(tipCursor);

    const matPreview = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
    const matWeapon = new THREE.MeshBasicMaterial({ color: colorHex });

    controller.userData = { isDrawing: false, isDashing: false, pointsWorld: [], previewMesh: null, weaponMesh: null };

    controller.addEventListener('selectstart', () => {
        if(GAME_STATE === 'START' || GAME_STATE === 'RESULT') {
            if(!currentUIPanel) return;
            const mat = new THREE.Matrix4().identity().extractRotation(controller.matrixWorld);
            raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
            raycaster.ray.direction.set(0, 0, -1).applyMatrix4(mat);
            const intersects = raycaster.intersectObject(currentUIPanel);
            if (intersects.length > 0 && intersects[0].uv.y < 0.4) startGame();
            return;
        }

        controller.userData.isDrawing = true;
        controller.userData.pointsWorld = [];
        if (controller.userData.previewMesh) { scene.remove(controller.userData.previewMesh); controller.userData.previewMesh = null; }
    });

    controller.addEventListener('selectend', () => {
        if(GAME_STATE !== 'PLAYING') return;
        controller.userData.isDrawing = false;
        if (controller.userData.previewMesh) { scene.remove(controller.userData.previewMesh); controller.userData.previewMesh = null; }

        if (controller.userData.pointsWorld.length > 1) {
            strokeHistory.push([...controller.userData.pointsWorld]);
            if (controller.userData.weaponMesh) controller.remove(controller.userData.weaponMesh);
            const ptsLocal = controller.userData.pointsWorld.map(p => controller.worldToLocal(p.clone()));
            const curve = new THREE.CatmullRomCurve3(ptsLocal);
            const weapon = new THREE.Mesh(new THREE.TubeGeometry(curve, ptsLocal.length * 2, WEAPON_RADIUS, 8, false), matWeapon);
            weapon.userData.pointsLocal = ptsLocal; 
            controller.add(weapon);
            controller.userData.weaponMesh = weapon;
        }
    });

    controller.addEventListener('squeezestart', () => { if(GAME_STATE === 'PLAYING') controller.userData.isDashing = true; });
    controller.addEventListener('squeezeend', () => { controller.userData.isDashing = false; });

    return { controller, tip, matPreview, laser, tipCursor };
}

const h1 = setupController(0, 0x00ffff);
const h2 = setupController(1, 0xff00ff);

// --- メインループ ---
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
    const time = clock.getElapsedTime();

    if (GAME_STATE === 'START' || GAME_STATE === 'RESULT') {
        [h1, h2].forEach(hand => {
            if (currentUIPanel && hand.laser.visible) {
                const mat = new THREE.Matrix4().identity().extractRotation(hand.controller.matrixWorld);
                raycaster.ray.origin.setFromMatrixPosition(hand.controller.matrixWorld);
                raycaster.ray.direction.set(0, 0, -1).applyMatrix4(mat);
                const intersects = raycaster.intersectObject(currentUIPanel);

                if (intersects.length > 0) {
                    const dist = intersects[0].distance;
                    hand.laser.geometry.attributes.position.setZ(1, -dist);
                    hand.laser.geometry.attributes.position.needsUpdate = true;
                    hand.tipCursor.visible = true;
                    hand.tipCursor.position.set(0, 0, -dist);
                } else {
                    hand.laser.geometry.attributes.position.setZ(1, -10);
                    hand.laser.geometry.attributes.position.needsUpdate = true;
                    hand.tipCursor.visible = false;
                }
            }
        });
    }

    if (GAME_STATE === 'PLAYING') {
        bossGroup.position.y = 8 + Math.sin(time) * 1.0;
        bossCore.rotation.x += 0.01; bossCore.rotation.y += 0.02;

        let activeArmorCount = 0;
        armorPieces.forEach(armor => {
            if(!armor.userData.isDead) {
                activeArmorCount++;
                armor.position.applyAxisAngle(armor.userData.axis, armor.userData.speed);
                armor.rotation.x += 0.05;
            }
        });

        let isAnyDashing = false;
        [h1, h2].forEach(hand => {
            if (hand.controller.userData.isDashing) {
                isAnyDashing = true;
                const dashDir = new THREE.Vector3(0, 0, -1).applyQuaternion(hand.controller.quaternion).normalize();
                dashVelocity.lerp(dashDir.multiplyScalar(0.15), 0.1); 
            }
        });
        if (isAnyDashing) playerRig.position.add(dashVelocity);
        else { dashVelocity.lerp(new THREE.Vector3(), 0.1); playerRig.position.add(dashVelocity); }

        [h1, h2].forEach(hand => {
            const ctrl = hand.controller;
            const tipPosWorld = new THREE.Vector3().setFromMatrixPosition(hand.tip.matrixWorld);

            if (ctrl.userData.isDrawing) {
                const pts = ctrl.userData.pointsWorld;
                if (pts.length === 0 || tipPosWorld.distanceTo(pts[pts.length - 1]) > 0.02) {
                    pts.push(tipPosWorld.clone());
                    if (pts.length > 1) {
                        if (ctrl.userData.previewMesh) scene.remove(ctrl.userData.previewMesh);
                        ctrl.userData.previewMesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 2, WEAPON_RADIUS, 8, false), hand.matPreview);
                        scene.add(ctrl.userData.previewMesh);
                    }
                }
            }

            if (ctrl.userData.weaponMesh) {
                const ptsLocal = ctrl.userData.weaponMesh.userData.pointsLocal;
                if (ptsLocal && ptsLocal.length > 1) {
                    const hitRadius = WEAPON_RADIUS * 6.0 + 0.2;
                    for (let i = 0; i < ptsLocal.length - 1; i++) {
                        const pStart = ptsLocal[i].clone().applyMatrix4(ctrl.matrixWorld);
                        const pEnd = ptsLocal[i+1].clone().applyMatrix4(ctrl.matrixWorld);
                        const line = new THREE.Line3(pStart, pEnd);
                        const closest = new THREE.Vector3();

                        armorPieces.forEach(armor => {
                            if (!armor.userData.isDead) {
                                const wPos = new THREE.Vector3(); armor.getWorldPosition(wPos);
                                line.closestPointToPoint(wPos, true, closest);
                                if (closest.distanceTo(wPos) < hitRadius + 0.3) shatterArmor(armor);
                            }
                        });

                        if (activeArmorCount < 50 && GAME_STATE === 'PLAYING') {
                            const cPos = new THREE.Vector3(); bossCore.getWorldPosition(cPos);
                            line.closestPointToPoint(cPos, true, closest);
                            if (closest.distanceTo(cPos) < hitRadius + 1.5) triggerResult();
                        }
                    }
                }
            }
        });
    } else if (GAME_STATE === 'RESULT') {
        if(resultGallery) resultGallery.rotation.y += 0.005;
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.position.add(p.userData.velocity);
        p.userData.velocity.multiplyScalar(0.95);
        p.userData.life -= 0.02;
        p.scale.setScalar(p.userData.life);
        if(p.userData.life <= 0) { scene.remove(p); particles.splice(i, 1); }
    }

    renderer.render(scene, camera);
});