"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const HALF_HEIGHT = 7.2;
const WAIST_RADIUS = 0.18;
const EDGE_RADIUS = 5.25;

function radiusAt(y: number) {
  const t = Math.min(Math.abs(y) / HALF_HEIGHT, 1);
  const eased = Math.pow(t, 0.62);
  return WAIST_RADIUS + (EDGE_RADIUS - WAIST_RADIUS) * eased;
}


const FLOW_VERTEX = `
  uniform float uTime;
  uniform float uFlow;
  varying float vEnergy;

  void main() {
    vec3 p = position;
    float radius = max(length(p.xz), 0.001);
    float angle = atan(p.z, p.x);
    float neckDistance = abs(p.y);

    // Two opposing waves travel from the wide ends toward the neck.
    // This creates the reference-like streaming sensation without moving
    // the whole funnel as a rigid object.
    float streamA = sin(neckDistance * 5.4 - uTime * uFlow + angle * 3.0);
    float streamB = sin(neckDistance * 10.0 - uTime * uFlow * 0.58 - angle * 5.0);

    float surface = smoothstep(0.06, 1.0, radius / 5.25);
    float twist = (streamA * 0.028 + streamB * 0.010) * surface;

    float a = angle
      + p.y * 0.17
      + twist
      + sin(p.y * 0.7 + uTime * 0.18) * 0.009;

    // A very small radial pulse travels inward with the stream phase.
    float radialFlow = (streamA * 0.012 + streamB * 0.004) * surface;
    float streamedRadius = radius + radialFlow;

    p.x = cos(a) * streamedRadius;
    p.z = sin(a) * streamedRadius;

    p.y += sin(angle * 3.0 + p.y * 1.7 + uTime * 0.32) * 0.012;

    vEnergy = 0.52 + 0.48 * (0.5 + 0.5 * streamA);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const FLOW_FRAGMENT = `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vEnergy;

  void main() {
    float brightness = mix(0.72, 1.0, vEnergy);
    gl_FragColor = vec4(uColor * brightness, uOpacity * brightness);
  }
`;

const GROUND_VERTEX = `
  uniform float uTime;
  varying float vEnergy;
  varying float vRadius;

  void main() {
    vec3 p = position;
    float radius = length(p.xz);
    float angle = atan(p.z, p.x);
    vRadius = radius;

    float wave = sin(radius * 2.25 - uTime * 0.85 + angle * 3.0);
    float wave2 = sin(radius * 5.2 - uTime * 0.42 + angle * 7.0);

    p.y += wave * 0.035 + wave2 * 0.012;
    p.xz *= 1.0 + wave * 0.004;

    vEnergy = 0.55 + 0.45 * (0.5 + 0.5 * wave);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const GROUND_FRAGMENT = `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vEnergy;
  varying float vRadius;

  void main() {
    // Keep the center dense and readable while letting rings disappear softly outward.
    float edgeFade = 1.0 - smoothstep(2.8, 6.25, vRadius);
    float centerLift = 0.72 + 0.28 * (1.0 - smoothstep(0.0, 1.4, vRadius));
    float alpha = uOpacity * edgeFade * centerLift * (0.72 + vEnergy * 0.28);
    gl_FragColor = vec4(uColor, alpha);
  }
`;

function createFlowMaterial(color: number, opacity: number, flow: number) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uFlow: { value: flow },
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
    },
    vertexShader: FLOW_VERTEX,
    fragmentShader: FLOW_FRAGMENT,
    transparent: true,
    depthWrite: false,
  });
}

function createGroundMaterial(color: number, opacity: number) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
    },
    vertexShader: GROUND_VERTEX,
    fragmentShader: GROUND_FRAGMENT,
    transparent: true,
    depthWrite: false,
  });
}

function buildContourGeometry() {
  const positions: number[] = [];
  const rings = 190;
  const segments = 360;

  for (let ring = 0; ring < rings; ring += 1) {
    const y = -HALF_HEIGHT + (ring / (rings - 1)) * HALF_HEIGHT * 2;
    const radius = radiusAt(y);

    for (let i = 0; i < segments; i += 1) {
      const a0 = (i / segments) * Math.PI * 2;
      const a1 = ((i + 1) / segments) * Math.PI * 2;
      const wave0 = 1 + 0.018 * Math.sin(a0 * 9 + y * 2.4);
      const wave1 = 1 + 0.018 * Math.sin(a1 * 9 + y * 2.4);
      const twist = y * 0.17;

      positions.push(
        Math.cos(a0 + twist) * radius * wave0,
        y,
        Math.sin(a0 + twist) * radius * wave0,
        Math.cos(a1 + twist) * radius * wave1,
        y,
        Math.sin(a1 + twist) * radius * wave1,
      );
    }
  }

  return new THREE.BufferGeometry().setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
}

function buildFlowGeometry() {
  const positions: number[] = [];
  const lines = 215;
  const points = 175;

  for (let line = 0; line < lines; line += 1) {
    const base = (line / lines) * Math.PI * 2;
    const phase = line * 0.37;

    for (let i = 0; i < points - 1; i += 1) {
      const y0 = -HALF_HEIGHT + (i / (points - 1)) * HALF_HEIGHT * 2;
      const y1 = -HALF_HEIGHT + ((i + 1) / (points - 1)) * HALF_HEIGHT * 2;

      const twist0 =
        base +
        y0 * 0.34 +
        Math.sin(y0 * 1.45 + phase) * 0.075 +
        Math.sin(y0 * 3.1 + base * 2) * 0.018;
      const twist1 =
        base +
        y1 * 0.34 +
        Math.sin(y1 * 1.45 + phase) * 0.075 +
        Math.sin(y1 * 3.1 + base * 2) * 0.018;

      const r0 = radiusAt(y0) * (0.985 + 0.025 * Math.sin(base * 5 + y0 * 1.8));
      const r1 = radiusAt(y1) * (0.985 + 0.025 * Math.sin(base * 5 + y1 * 1.8));

      positions.push(
        Math.cos(twist0) * r0,
        y0,
        Math.sin(twist0) * r0,
        Math.cos(twist1) * r1,
        y1,
        Math.sin(twist1) * r1,
      );
    }
  }

  return new THREE.BufferGeometry().setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
}

function buildGroundFlowGeometry() {
  const positions: number[] = [];
  const lines = 150;
  const points = 125;

  for (let line = 0; line < lines; line += 1) {
    const base = (line / lines) * Math.PI * 2;
    const phase = line * 0.61;

    for (let i = 0; i < points - 1; i += 1) {
      const t0 = i / (points - 1);
      const t1 = (i + 1) / (points - 1);
      const r0 = 0.16 + t0 * 6.5;
      const r1 = 0.16 + t1 * 6.5;

      const a0 = base + r0 * 0.82 + Math.sin(r0 * 1.7 + phase) * 0.055;
      const a1 = base + r1 * 0.82 + Math.sin(r1 * 1.7 + phase) * 0.055;

      const y0 = -0.16 - Math.pow(t0, 0.78) * 3.55 + Math.sin(r0 * 1.6 + phase) * 0.035;
      const y1 = -0.16 - Math.pow(t1, 0.78) * 3.55 + Math.sin(r1 * 1.6 + phase) * 0.035;

      positions.push(
        Math.cos(a0) * r0,
        y0,
        Math.sin(a0) * r0,
        Math.cos(a1) * r1,
        y1,
        Math.sin(a1) * r1,
      );
    }
  }

  return new THREE.BufferGeometry().setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
}

function buildGroundContoursGeometry() {
  const positions: number[] = [];
  const rings = 82;
  const segments = 300;

  for (let ring = 0; ring < rings; ring += 1) {
    const t = ring / (rings - 1);
    const radius = 0.16 + Math.pow(t, 1.72) * 6.2;
    const floorY = -0.16 - Math.pow(t, 0.78) * 3.55;

    for (let i = 0; i < segments; i += 1) {
      const a0 = (i / segments) * Math.PI * 2;
      const a1 = ((i + 1) / segments) * Math.PI * 2;
      const wave0 = Math.sin(a0 * 7 + radius * 2.3) * 0.045;
      const wave1 = Math.sin(a1 * 7 + radius * 2.3) * 0.045;

      positions.push(
        Math.cos(a0) * (radius + wave0),
        floorY + Math.sin(a0 * 3 + radius) * 0.018,
        Math.sin(a0) * (radius + wave0),
        Math.cos(a1) * (radius + wave1),
        floorY + Math.sin(a1 * 3 + radius) * 0.018,
        Math.sin(a1) * (radius + wave1),
      );
    }
  }

  return new THREE.BufferGeometry().setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
}

function buildParticles() {
  const positions: number[] = [];
  const count = 1100;

  for (let i = 0; i < count; i += 1) {
    const t = (i * 0.61803398875) % 1;
    const y = -HALF_HEIGHT + t * HALF_HEIGHT * 2;
    const theta = (i * 2.3999632297) % (Math.PI * 2);
    const radius = radiusAt(y) * (0.94 + ((i * 0.754877666) % 1) * 0.09);

    positions.push(
      Math.cos(theta + y * 0.34) * radius,
      y,
      Math.sin(theta + y * 0.34) * radius,
    );
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return geometry;
}

export default function HeroVortex() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 40);
    camera.position.set(0, 0.15, 15.6);
    camera.lookAt(0, -0.55, 0);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.setAttribute("aria-hidden", "true");
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.inset = "0";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.pointerEvents = "none";
    renderer.domElement.style.display = "block";
    mount.appendChild(renderer.domElement);

    const vortex = new THREE.Group();

    const contourMaterial = createFlowMaterial(0xf4f6f8, 0.14, 0.34);
    const contourGeometry = buildContourGeometry();
    const contours = new THREE.LineSegments(contourGeometry, contourMaterial);

    const flowMaterial = createFlowMaterial(0xffffff, 0.24, 0.78);
    const flowGeometry = buildFlowGeometry();
    const flowLines = new THREE.LineSegments(flowGeometry, flowMaterial);

    const groundFlowMaterial = createGroundMaterial(0xf4f6f8, 0.32);
    const groundFlowGeometry = buildGroundFlowGeometry();
    const groundFlow = new THREE.LineSegments(groundFlowGeometry, groundFlowMaterial);

    const groundContourMaterial = createGroundMaterial(0xdde3e9, 0.12);
    const groundContourGeometry = buildGroundContoursGeometry();
    const groundContours = new THREE.LineSegments(
      groundContourGeometry,
      groundContourMaterial,
    );

    const particleMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.018,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const particleGeometry = buildParticles();
    const particles = new THREE.Points(particleGeometry, particleMaterial);

    vortex.add(contours, flowLines, particles);
    scene.add(vortex, groundFlow, groundContours);

    const resize = () => {
      const width = Math.max(mount.clientWidth, 1);
      const height = Math.max(mount.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);

      const compact = width < 760;
      vortex.scale.setScalar(compact ? 0.7 : 1.0);
      vortex.position.y = compact ? 0.25 : 0.05;
      groundFlow.scale.setScalar(compact ? 0.72 : 1);
      groundContours.scale.setScalar(compact ? 0.72 : 1);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(mount);

    let frame = 0;
    let active = true;
    let targetScroll = 0;
    let scrollProgress = 0;
    const clock = new THREE.Clock();

    const onScroll = () => {
      const max = Math.max(window.innerHeight * 0.9, 1);
      targetScroll = Math.min(window.scrollY / max, 1);
    };

    const visibility = () => {
      active = !document.hidden;
      if (active) {
        clock.start();
        cancelAnimationFrame(frame);
        animate();
      } else {
        cancelAnimationFrame(frame);
      }
    };

    const animate = () => {
      if (!active) return;

      const elapsed = clock.getElapsedTime();

      if (!reducedMotion) {
        vortex.rotation.y = elapsed * 0.012;
        vortex.rotation.z = Math.sin(elapsed * 0.09) * 0.008;
        groundFlow.rotation.y = -elapsed * 0.005;
        groundContours.rotation.y = -elapsed * 0.003;
      }

      const animationTime = reducedMotion ? 0 : elapsed;
      (contourMaterial.uniforms.uTime.value = animationTime);
      (flowMaterial.uniforms.uTime.value = animationTime);
      (groundFlowMaterial.uniforms.uTime.value = animationTime);
      (groundContourMaterial.uniforms.uTime.value = animationTime);

      scrollProgress += (targetScroll - scrollProgress) * 0.055;

      const lift = scrollProgress * 1.15;
      vortex.position.y = (mount.clientWidth < 760 ? 0.25 : 0.05) + lift;
      vortex.scale.setScalar((mount.clientWidth < 760 ? 0.62 : 0.88) + scrollProgress * 0.12);
      groundFlow.position.y = -scrollProgress * 0.48;
      groundContours.position.y = -scrollProgress * 0.48;

      const fade = 1 - scrollProgress * 0.72;
      flowMaterial.uniforms.uOpacity.value = 0.24 * fade;
      contourMaterial.uniforms.uOpacity.value = 0.14 * fade;
      particleMaterial.opacity = 0.42 * fade;
      groundFlowMaterial.uniforms.uOpacity.value = 0.32 * fade;
      groundContourMaterial.uniforms.uOpacity.value = 0.12 * fade;

      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", visibility);
    onScroll();
    animate();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", visibility);
      observer.disconnect();

      contourGeometry.dispose();
      flowGeometry.dispose();
      groundFlowGeometry.dispose();
      groundContourGeometry.dispose();
      particleGeometry.dispose();

      contourMaterial.dispose();
      flowMaterial.dispose();
      groundFlowMaterial.dispose();
      groundContourMaterial.dispose();
      particleMaterial.dispose();

      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={mountRef} className="nh-vortex" aria-hidden="true" />;
}
