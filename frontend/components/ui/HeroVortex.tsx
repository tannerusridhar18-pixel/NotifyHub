"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

function buildHourglass(): THREE.BufferGeometry {
  const positions: number[] = [];
  const radialSteps = 56;
  const halfHeight = 2.45;
  const pointsPerCurve = 64;

  const radiusAt = (y: number) => {
    const normalized = Math.abs(y) / halfHeight;
    return 0.16 + 1.48 * Math.pow(normalized, 0.78) + 0.08 * Math.sin(normalized * Math.PI * 3);
  };

  for (let r = 0; r < radialSteps; r += 1) {
    const theta = (r / radialSteps) * Math.PI * 2;
    for (let i = 0; i < pointsPerCurve - 1; i += 1) {
      const y0 = -halfHeight + (i / (pointsPerCurve - 1)) * halfHeight * 2;
      const y1 = -halfHeight + ((i + 1) / (pointsPerCurve - 1)) * halfHeight * 2;
      const twist0 = theta + y0 * 0.22 + Math.sin(y0 * 2.2 + theta) * 0.025;
      const twist1 = theta + y1 * 0.22 + Math.sin(y1 * 2.2 + theta) * 0.025;
      const r0 = radiusAt(y0);
      const r1 = radiusAt(y1);
      positions.push(
        Math.cos(twist0) * r0, y0, Math.sin(twist0) * r0,
        Math.cos(twist1) * r1, y1, Math.sin(twist1) * r1,
      );
    }
  }

  for (let y = 0; y < 42; y += 1) {
    const value = -halfHeight + (y / 41) * halfHeight * 2;
    const radius = radiusAt(value);
    const segments = 96;
    for (let i = 0; i < segments; i += 1) {
      const a0 = (i / segments) * Math.PI * 2 + value * 0.22;
      const a1 = ((i + 1) / segments) * Math.PI * 2 + value * 0.22;
      const wobble0 = 1 + Math.sin(a0 * 7 + value * 2.4) * 0.025;
      const wobble1 = 1 + Math.sin(a1 * 7 + value * 2.4) * 0.025;
      positions.push(
        Math.cos(a0) * radius * wobble0, value, Math.sin(a0) * radius * wobble0,
        Math.cos(a1) * radius * wobble1, value, Math.sin(a1) * radius * wobble1,
      );
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return geometry;
}

function buildGroundRings(): THREE.BufferGeometry {
  const positions: number[] = [];
  const rings = 16;
  const segments = 128;

  for (let ring = 0; ring < rings; ring += 1) {
    const radius = 0.25 + (ring / (rings - 1)) * 4.8;
    for (let i = 0; i < segments; i += 1) {
      const a0 = (i / segments) * Math.PI * 2;
      const a1 = ((i + 1) / segments) * Math.PI * 2;
      const wave0 = Math.sin(a0 * 7 + radius * 2.5) * 0.035;
      const wave1 = Math.sin(a1 * 7 + radius * 2.5) * 0.035;
      positions.push(
        Math.cos(a0) * (radius + wave0), -2.62, Math.sin(a0) * (radius + wave0),
        Math.cos(a1) * (radius + wave1), -2.62, Math.sin(a1) * (radius + wave1),
      );
    }
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
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 30);
    camera.position.set(0, 0.25, 9.2);
    camera.lookAt(0, -0.2, 0);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      // Keep the homepage usable when WebGL is unavailable or the browser
      // cannot create a graphics context.
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
    const vortexMaterial = new THREE.LineBasicMaterial({
      color: 0xe9edf2,
      transparent: true,
      opacity: 0.33,
      depthWrite: false,
    });
    const vortexGeometry = buildHourglass();
    const vortexLines = new THREE.LineSegments(vortexGeometry, vortexMaterial);
    vortex.add(vortexLines);

    const waistMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    });
    const waistGeometry = new THREE.TorusGeometry(0.17, 0.008, 4, 96);
    const waist = new THREE.LineSegments(new THREE.WireframeGeometry(waistGeometry), waistMaterial);
    waist.rotation.x = Math.PI / 2;
    vortex.add(waist);

    const ringMaterial = new THREE.LineBasicMaterial({
      color: 0xd7dde5,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    });
    const ringGeometry = buildGroundRings();
    const groundRings = new THREE.LineSegments(ringGeometry, ringMaterial);

    scene.add(vortex, groundRings);

    const resize = () => {
      const width = Math.max(mount.clientWidth, 1);
      const height = Math.max(mount.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(mount);

    let frame = 0;
    let active = true;
    const clock = new THREE.Clock();

    const animate = () => {
      if (!active) return;

      const elapsed = clock.getElapsedTime();
      if (!reducedMotion) {
        vortex.rotation.y = elapsed * 0.055;
        vortex.rotation.z = Math.sin(elapsed * 0.17) * 0.035;
        groundRings.rotation.y = -elapsed * 0.018;
      }
      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
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

    document.addEventListener("visibilitychange", visibility);
    animate();

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", visibility);
      observer.disconnect();
      vortexGeometry.dispose();
      waistGeometry.dispose();
      ringGeometry.dispose();
      vortexMaterial.dispose();
      waistMaterial.dispose();
      ringMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={mountRef} className="nh-vortex" aria-hidden="true" />;
}
