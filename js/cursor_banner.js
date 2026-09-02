import * as THREE from "https://esm.sh/three";
import { EffectComposer } from "https://esm.sh/three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "https://esm.sh/three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "https://esm.sh/three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "https://esm.sh/three/examples/jsm/postprocessing/OutputPass.js";
import { ShaderPass } from "https://esm.sh/three/examples/jsm/postprocessing/ShaderPass.js";

// Optimized rendering container setup
document.body.style.transform = "translateZ(0)";
document.body.style.backfaceVisibility = "hidden";
document.body.style.perspective = "1000px";

const scene = new THREE.Scene();
scene.background = null;

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 20;

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance",
  alpha: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;
renderer.setClearColor(0x000000, 0);

renderer.domElement.style.position = "fixed";
renderer.domElement.style.top = "0";
renderer.domElement.style.left = "0";
renderer.domElement.style.zIndex = "999";
renderer.domElement.style.pointerEvents = "none";
renderer.domElement.style.background = "transparent";

document.body.appendChild(renderer.domElement);

// Retro / Vintage analog shader
const analogDecayShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0.0 },
    uAnalogGrain: { value: 0.15 },
    uAnalogScanlines: { value: 0.3 },
    uAnalogVignette: { value: 1.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uAnalogGrain;
    uniform float uAnalogScanlines;
    uniform float uAnalogVignette;
    varying vec2 vUv;

    float gaussian(float z, float u, float o) {
      return (1.0 / (o * sqrt(2.0 * 3.1415))) * exp(-(((z - u) * (z - u)) / (2.0 * (o * o))));
    }
    vec3 grain(vec2 uv, float time, float intensity) {
      float seed = dot(uv, vec2(12.9898, 78.233));
      float noise = fract(sin(seed) * 43758.5453 + time * 2.0);
      noise = gaussian(noise, 0.0, 0.5 * 0.5);
      return vec3(noise) * intensity;
    }

    void main() {
      vec2 uv = vUv;
      vec4 color = texture2D(tDiffuse, uv);
      
      if (uAnalogGrain > 0.01) {
        vec3 grainEffect = grain(uv, uTime, 0.075 * uAnalogGrain);
        grainEffect *= (1.0 - color.rgb);
        color.rgb += grainEffect;
      }
      if (uAnalogScanlines > 0.01) {
        float scanlinePattern = sin(uv.y * 800.0) * 0.5 + 0.5;
        color.rgb *= (1.0 - scanlinePattern * 0.1 * uAnalogScanlines);
      }
      if (uAnalogVignette > 0.01) {
        vec2 vignetteUV = (uv - 0.5) * 2.0;
        float vignette = 1.0 - dot(vignetteUV, vignetteUV) * 0.3 * uAnalogVignette;
        color.rgb *= vignette;
      }

      gl_FragColor = color;
    }
  `
};

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.6, 1.2, 0.1);
composer.addPass(bloomPass);
const analogPass = new ShaderPass(analogDecayShader);
composer.addPass(analogPass);
composer.addPass(new OutputPass());

// Lighting
scene.add(new THREE.AmbientLight(0x0a0a2e, 1.0));

const rimLight1 = new THREE.DirectionalLight(0xff4a90, 2.5);
rimLight1.position.set(-8, 6, -4);
scene.add(rimLight1);
const rimLight2 = new THREE.DirectionalLight(0x50e3c2, 1.5);
rimLight2.position.set(8, -4, -6);
scene.add(rimLight2);

// Cursor Group
const cursorGroup = new THREE.Group();
scene.add(cursorGroup);

// --- 3D SHIELD ICON (Elegido según preferencia del usuario) ---
const shieldShape = new THREE.Shape();
const w = 1.6, h = 2.2;
shieldShape.moveTo(0, h / 2);
shieldShape.quadraticCurveTo(w / 2, h / 2, w / 2, h / 6);
shieldShape.quadraticCurveTo(w / 2, -h / 4, 0, -h / 2);
shieldShape.quadraticCurveTo(-w / 2, -h / 4, -w / 2, h / 6);
shieldShape.quadraticCurveTo(-w / 2, h / 2, 0, h / 2);

const extrudeSettings = {
  depth: 0.5,
  bevelEnabled: true,
  bevelSegments: 4,
  steps: 2,
  bevelSize: 0.15,
  bevelThickness: 0.15
};

const cursorGeometry = new THREE.ExtrudeGeometry(shieldShape, extrudeSettings);
cursorGeometry.center();

const cursorMaterial = new THREE.MeshStandardMaterial({
  color: 0xff2a55,
  emissive: 0xff0044,
  emissiveIntensity: 1.2,
  roughness: 0.25,
  metalness: 0.3,
  transparent: false
});
const cursorMesh = new THREE.Mesh(cursorGeometry, cursorMaterial);
cursorGroup.add(cursorMesh);

// --- FACES (NORMAL & DIZZY) ATTACHED TO MESH ---
const faceGroup = new THREE.Group();
cursorMesh.add(faceGroup);

// NORMAL FACE
const normalFace = new THREE.Group();
faceGroup.add(normalFace);

const socketGeometry = new THREE.SphereGeometry(0.35, 16, 16);
const socketMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
const leftSocket = new THREE.Mesh(socketGeometry, socketMaterial);
leftSocket.position.set(-0.45, 0.3, 0.4);
leftSocket.scale.set(1.1, 1.0, 0.6);
normalFace.add(leftSocket);

const rightSocket = new THREE.Mesh(socketGeometry, socketMaterial);
rightSocket.position.set(0.45, 0.3, 0.4);
rightSocket.scale.set(1.1, 1.0, 0.6);
normalFace.add(rightSocket);

const eyeGeometry = new THREE.SphereGeometry(0.22, 12, 12);
const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
leftEye.position.set(-0.45, 0.3, 0.48);
normalFace.add(leftEye);

const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
rightEye.position.set(0.45, 0.3, 0.48);
normalFace.add(rightEye);

const smileGeo = new THREE.TorusGeometry(0.2, 0.05, 16, 32, Math.PI);
const smileMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
const smile = new THREE.Mesh(smileGeo, smileMat);
smile.rotation.z = Math.PI;
smile.position.set(0, -0.05, 0.45);
normalFace.add(smile);

// DIZZY FACE
const dizzyFace = new THREE.Group();
dizzyFace.visible = false;
faceGroup.add(dizzyFace);

const xMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
const xGeo = new THREE.BoxGeometry(0.3, 0.06, 0.08);

const leftXGroup = new THREE.Group();
const line1 = new THREE.Mesh(xGeo, xMat);
line1.rotation.z = Math.PI / 4;
const line2 = new THREE.Mesh(xGeo, xMat);
line2.rotation.z = -Math.PI / 4;
leftXGroup.add(line1, line2);
leftXGroup.position.set(-0.45, 0.3, 0.45);
dizzyFace.add(leftXGroup);

const rightXGroup = new THREE.Group();
const line3 = new THREE.Mesh(xGeo, xMat);
line3.rotation.z = Math.PI / 4;
const line4 = new THREE.Mesh(xGeo, xMat);
line4.rotation.z = -Math.PI / 4;
rightXGroup.add(line3, line4);
rightXGroup.position.set(0.45, 0.3, 0.45);
dizzyFace.add(rightXGroup);

const mouthGeo = new THREE.TorusGeometry(0.1, 0.05, 16, 32);
const dizzyMouth = new THREE.Mesh(mouthGeo, xMat);
dizzyMouth.position.set(0, -0.08, 0.45);
dizzyFace.add(dizzyMouth);

// --- PARTICLES ---
const fireflies = [];
const fireflyGroup = new THREE.Group();
scene.add(fireflyGroup);

for (let i = 0; i < 12; i++) {
  const geo = new THREE.SphereGeometry(0.04, 4, 4);
  const mat = new THREE.MeshBasicMaterial({ color: 0xff6688, transparent: true, opacity: 0.8 });
  const firefly = new THREE.Mesh(geo, mat);
  
  firefly.position.set(
    (Math.random() - 0.5) * 35,
    (Math.random() - 0.5) * 25,
    (Math.random() - 0.5) * 15
  );
  
  firefly.userData = {
    velocity: new THREE.Vector3(
      (Math.random() - 0.5) * 0.04,
      (Math.random() - 0.5) * 0.04,
      (Math.random() - 0.5) * 0.04
    ),
    phase: Math.random() * Math.PI * 2
  };
  
  fireflyGroup.add(firefly);
  fireflies.push(firefly);
}

// Mouse tracking
let mouseX = 0;
let mouseY = 0;
let targetX = 0;
let targetY = 0;
let isInteracting = false;

function onMouseMove(event) {
  isInteracting = true;
  mouseX = (event.clientX / window.innerWidth) * 2 - 1;
  mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
  
  const vector = new THREE.Vector3(mouseX, mouseY, 0.5);
  vector.unproject(camera);
  const dir = vector.sub(camera.position).normalize();
  const distance = -camera.position.z / dir.z;
  const pos = camera.position.clone().add(dir.multiplyScalar(distance));
  
  targetX = pos.x;
  targetY = pos.y;
}

window.addEventListener('mousemove', onMouseMove);
window.addEventListener('touchmove', (e) => {
  if (e.touches.length > 0) {
    onMouseMove(e.touches[0]);
  }
}, { passive: false });

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// Render Loop & Dizzy Mechanics
let dizzyTimer = 0;
let movingFrames = 0;

function animate() {
  requestAnimationFrame(animate);

  const time = performance.now() * 0.001;
  analogPass.uniforms.uTime.value = time;

  fireflies.forEach(firefly => {
    firefly.position.add(firefly.userData.velocity);
    firefly.userData.velocity.x += (Math.random() - 0.5) * 0.002;
    firefly.userData.velocity.y += (Math.random() - 0.5) * 0.002;
    firefly.userData.velocity.z += (Math.random() - 0.5) * 0.002;
    firefly.userData.velocity.clampLength(0, 0.04);
    
    if (Math.abs(firefly.position.x) > 25) firefly.userData.velocity.x *= -1;
    if (Math.abs(firefly.position.y) > 18) firefly.userData.velocity.y *= -1;
    if (Math.abs(firefly.position.z) > 12) firefly.userData.velocity.z *= -1;
    
    firefly.material.opacity = Math.sin(time * 3.0 + firefly.userData.phase) * 0.3 + 0.5;
  });

  if (!isInteracting) {
    targetX += (0 - targetX) * 0.05;
    targetY += (0 - targetY) * 0.05;
  }

  cursorGroup.position.x += (targetX - cursorGroup.position.x) * 0.08;
  cursorGroup.position.y += (targetY - cursorGroup.position.y) * 0.08;

  const dx = targetX - cursorGroup.position.x;
  const dy = targetY - cursorGroup.position.y;
  const speed = Math.sqrt(dx * dx + dy * dy);
  
  if (speed > 1.6) {
    movingFrames++;
  } else {
    if (movingFrames > 60) {
      dizzyTimer = 75; // Se marea por ~1.25 segundos al detenerse tras moverse rápido
    }
    movingFrames = 0;
  }

  const isDizzy = (movingFrames > 60) || (dizzyTimer > 0);

  if (isDizzy) {
    normalFace.visible = false;
    dizzyFace.visible = true;
    leftXGroup.rotation.z += 0.15;
    rightXGroup.rotation.z -= 0.15; 
  } else {
    normalFace.visible = true;
    dizzyFace.visible = false;
    leftXGroup.rotation.z = 0;
    rightXGroup.rotation.z = 0;
  }

  if (dizzyTimer > 0) dizzyTimer--;
  
  const maxTilt = 0.5;
  const tiltX = Math.min(Math.max(dy * 0.12, -maxTilt), maxTilt); 
  const tiltY = Math.min(Math.max(-dx * 0.12, -maxTilt), maxTilt);

  cursorMesh.rotation.x += (tiltX - cursorMesh.rotation.x) * 0.1;
  cursorMesh.rotation.y += (tiltY - cursorMesh.rotation.y) * 0.1;

  composer.render();
}

animate();
