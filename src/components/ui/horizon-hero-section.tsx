import React from 'react';
import * as THREE from 'three';
import type { Scene, PerspectiveCamera, WebGLRenderer, Mesh, Points, BufferGeometry, Material, ShapeGeometry, MeshBasicMaterial } from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import Navbar from '@/components/Navbar';

gsap.registerPlugin(ScrollTrigger);

// Interface to define the structure of our Three.js objects ref.
interface ThreeSceneRefs {
  scene: Scene | null;
  camera: PerspectiveCamera | null;
  renderer: WebGLRenderer | null;
  composer: EffectComposer | null;
  stars: Points<BufferGeometry, Material | Material[]>[];
  nebula: Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial> | null;
  mountains: Mesh<ShapeGeometry, MeshBasicMaterial>[];
  animationId: number | null;
  targetCameraX: number;
  targetCameraY: number;
  targetCameraZ: number;
  locations: number[];
}

export const Component = () => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const titleRef = React.useRef<HTMLHeadingElement>(null);
  const subtitleRef = React.useRef<HTMLDivElement>(null);
  const scrollProgressRef = React.useRef<HTMLDivElement>(null);

  const smoothCameraPos = React.useRef({ x: 0, y: 30, z: 100 });

  const [scrollProgress, setScrollProgress] = React.useState(0);
  const [currentSection, setCurrentSection] = React.useState(0);
  const [isReady, setIsReady] = React.useState(false);
  const totalSections = 2;

  // Apply our interface to the useRef hook
  const threeRefs = React.useRef<ThreeSceneRefs>({
    scene: null,
    camera: null,
    renderer: null,
    composer: null,
    stars: [],
    nebula: null,
    mountains: [],
    animationId: null,
    targetCameraX: 0,
    targetCameraY: 20,
    targetCameraZ: 100,
    locations: [],
  });

  React.useEffect(() => {
    // Keep refs in a variable to avoid accessing .current repeatedly
    const refs = threeRefs.current;
    
    // ====================================================================
    // DEFINITIVE FIX: The `create...` functions now accept the scene directly.
    // This removes all ambiguity for TypeScript.
    // ====================================================================

    const createStarField = (scene: THREE.Scene) => {
        const starCount = 5000;
        for (let i = 0; i < 3; i++) {
          const geometry = new THREE.BufferGeometry();
          const positions = new Float32Array(starCount * 3);
          const colors = new Float32Array(starCount * 3);
          const sizes = new Float32Array(starCount);
          for (let j = 0; j < starCount; j++) {
            const radius = 200 + Math.random() * 800;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(Math.random() * 2 - 1);
            positions[j * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[j * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[j * 3 + 2] = radius * Math.cos(phi);
            const color = new THREE.Color();
            const colorChoice = Math.random();
            if (colorChoice < 0.7) color.setHSL(0, 0, 0.8 + Math.random() * 0.2);
            else if (colorChoice < 0.9) color.setHSL(0.08, 0.5, 0.8);
            else color.setHSL(0.6, 0.5, 0.8);
            colors[j * 3] = color.r;
            colors[j * 3 + 1] = color.g;
            colors[j * 3 + 2] = color.b;
            sizes[j] = Math.random() * 2 + 0.5;
          }
          geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
          geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
          geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
          const material = new THREE.ShaderMaterial({
            uniforms: { time: { value: 0 }, depth: { value: i } },
            vertexShader: `attribute float size; attribute vec3 color; varying vec3 vColor; uniform float time; uniform float depth; void main() { vColor = color; vec3 pos = position; float angle = time * 0.05 * (1.0 - depth * 0.3); mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)); pos.xy = rot * pos.xy; vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0); gl_PointSize = size * (300.0 / -mvPosition.z); gl_Position = projectionMatrix * mvPosition; }`,
            fragmentShader: `varying vec3 vColor; void main() { float dist = length(gl_PointCoord - vec2(0.5)); if (dist > 0.5) discard; float opacity = 1.0 - smoothstep(0.0, 0.5, dist); gl_FragColor = vec4(vColor, opacity); }`,
            transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
          });
          const stars = new THREE.Points(geometry, material);
          scene.add(stars); // Use the guaranteed 'scene' parameter
          refs.stars.push(stars);
        }
    };

    const createNebula = (scene: THREE.Scene) => {
        const geometry = new THREE.PlaneGeometry(8000, 4000, 100, 100);
        const material = new THREE.ShaderMaterial({
          uniforms: { time: { value: 0 }, color1: { value: new THREE.Color(0x0033ff) }, color2: { value: new THREE.Color(0xff0066) }, opacity: { value: 0.3 } },
          vertexShader: `varying vec2 vUv; varying float vElevation; uniform float time; void main() { vUv = uv; vec3 pos = position; float elevation = sin(pos.x * 0.01 + time) * cos(pos.y * 0.01 + time) * 20.0; pos.z += elevation; vElevation = elevation; gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0); }`,
          fragmentShader: `uniform vec3 color1; uniform vec3 color2; uniform float opacity; uniform float time; varying vec2 vUv; varying float vElevation; void main() { float mixFactor = sin(vUv.x * 10.0 + time) * cos(vUv.y * 10.0 + time); vec3 color = mix(color1, color2, mixFactor * 0.5 + 0.5); float alpha = opacity * (1.0 - length(vUv - 0.5) * 2.0); alpha *= 1.0 + vElevation * 0.01; gl_FragColor = vec4(color, alpha); }`,
          transparent: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false
        });
        const nebula = new THREE.Mesh(geometry, material);
        nebula.position.z = -1050;
        nebula.rotation.x = 0;
        scene.add(nebula); // Use the guaranteed 'scene' parameter
        refs.nebula = nebula;
    };
      
    const createMountains = (scene: THREE.Scene) => {
        const layers = [
          { distance: -50, height: 60, color: 0x1a1a2e, opacity: 1 },
          { distance: -100, height: 80, color: 0x16213e, opacity: 0.8 },
          { distance: -150, height: 100, color: 0x0f3460, opacity: 0.6 },
          { distance: -200, height: 120, color: 0x0a4668, opacity: 0.4 }
        ];
        layers.forEach((layer) => {
          const points: THREE.Vector2[] = [];
          const segments = 50;
          for (let i = 0; i <= segments; i++) {
            const x = (i / segments - 0.5) * 1000;
            const y = Math.sin(i * 0.1) * layer.height + Math.sin(i * 0.05) * layer.height * 0.5 + Math.random() * layer.height * 0.2 - 100;
            points.push(new THREE.Vector2(x, y));
          }
          points.push(new THREE.Vector2(5000, -300));
          points.push(new THREE.Vector2(-5000, -300));
          const shape = new THREE.Shape(points);
          const geometry = new THREE.ShapeGeometry(shape);
          const material = new THREE.MeshBasicMaterial({ color: layer.color, transparent: true, opacity: layer.opacity, side: THREE.DoubleSide });
          const mountain = new THREE.Mesh(geometry, material);
          mountain.position.z = layer.distance;
          mountain.position.y = layer.distance;
          mountain.userData = { baseZ: layer.distance };
          scene.add(mountain); // Use the guaranteed 'scene' parameter
          refs.mountains.push(mountain);
        });
    };
      
    const createAtmosphere = (scene: THREE.Scene) => {
        const geometry = new THREE.SphereGeometry(600, 32, 32);
        const material = new THREE.ShaderMaterial({
          uniforms: { time: { value: 0 } },
          vertexShader: `varying vec3 vNormal; varying vec3 vPosition; void main() { vNormal = normalize(normalMatrix * normal); vPosition = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
          fragmentShader: `varying vec3 vNormal; varying vec3 vPosition; uniform float time; void main() { float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0); vec3 atmosphere = vec3(0.3, 0.6, 1.0) * intensity; float pulse = sin(time * 2.0) * 0.1 + 0.9; atmosphere *= pulse; gl_FragColor = vec4(atmosphere, intensity * 0.25); }`,
          side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true
        });
        const atmosphere = new THREE.Mesh(geometry, material);
        scene.add(atmosphere); // Use the guaranteed 'scene' parameter
    };

    const animate = () => {
        refs.animationId = requestAnimationFrame(animate);
        const time = Date.now() * 0.001;
        refs.stars.forEach((starField) => {
            if (starField.material instanceof THREE.ShaderMaterial) starField.material.uniforms.time.value = time;
        });
        if (refs.nebula?.material instanceof THREE.ShaderMaterial) refs.nebula.material.uniforms.time.value = time * 0.5;
        if (refs.camera) {
            const smoothingFactor = 0.05;
            smoothCameraPos.current.x += (refs.targetCameraX - smoothCameraPos.current.x) * smoothingFactor;
            smoothCameraPos.current.y += (refs.targetCameraY - smoothCameraPos.current.y) * smoothingFactor;
            smoothCameraPos.current.z += (refs.targetCameraZ - smoothCameraPos.current.z) * smoothingFactor;
            const floatX = Math.sin(time * 0.1) * 2;
            const floatY = Math.cos(time * 0.15) * 1;
            refs.camera.position.set(smoothCameraPos.current.x + floatX, smoothCameraPos.current.y + floatY, smoothCameraPos.current.z);
            refs.camera.lookAt(0, 10, -600);
        }
        refs.mountains.forEach((mountain, i) => {
            const parallaxFactor = 1 + i * 0.9;
            mountain.position.x = Math.sin(time * 0.1) * 2 * parallaxFactor;
            mountain.position.y = 50 + (Math.cos(time * 0.15) * 1 * parallaxFactor);
        });
        refs.composer?.render();
    };
    
    const initThree = () => {
        if (!canvasRef.current) return;
        
        // Create the scene and store it in a local variable
        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x000000, 0.00025);
        refs.scene = scene; // Also assign it to the ref

        refs.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
        refs.camera.position.z = 100;
        refs.camera.position.y = 20;

        refs.renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true, alpha: true });
        refs.renderer.setSize(window.innerWidth, window.innerHeight);
        refs.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        refs.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        refs.renderer.toneMappingExposure = 0.5;

        const renderPass = new RenderPass(scene, refs.camera);
        refs.composer = new EffectComposer(refs.renderer);
        refs.composer.addPass(renderPass);

        const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.8, 0.4, 0.85);
        refs.composer.addPass(bloomPass);

        // DEFINITIVE FIX: Pass the newly created scene to each function
        createStarField(scene);
        createNebula(scene);
        createMountains(scene);
        createAtmosphere(scene);
        getLocation();

        animate();
        setIsReady(true);
    };

    initThree();

    const handleResize = () => {
        if (refs.camera && refs.renderer && refs.composer) {
            refs.camera.aspect = window.innerWidth / window.innerHeight;
            refs.camera.updateProjectionMatrix();
            refs.renderer.setSize(window.innerWidth, window.innerHeight);
            refs.composer.setSize(window.innerWidth, window.innerHeight);
        }
    };
    window.addEventListener('resize', handleResize);

    return () => {
        if (refs.animationId) cancelAnimationFrame(refs.animationId);
        window.removeEventListener('resize', handleResize);
        refs.mountains.forEach(m => { m.geometry.dispose(); m.material.dispose(); });
        refs.stars.forEach(s => { s.geometry.dispose(); if(Array.isArray(s.material)) s.material.forEach(m=>m.dispose()); else s.material.dispose(); });
        refs.nebula?.geometry.dispose();
        refs.nebula?.material.dispose();
        refs.renderer?.dispose();
    };
  }, []);

  const getLocation = () => {
    const refs = threeRefs.current;
    refs.locations = refs.mountains.map(mountain => mountain.position.z);
  };

  React.useEffect(() => {
    if (!isReady || !titleRef.current || !subtitleRef.current || !scrollProgressRef.current) return;
    gsap.set([titleRef.current, subtitleRef.current, scrollProgressRef.current], { visibility: 'visible' });
    const tl = gsap.timeline();
    const titleChars = titleRef.current.querySelectorAll('.title-char');
    tl.from(titleChars, { y: 200, opacity: 0, duration: 1.5, stagger: 0.05, ease: "power4.out" }, "-=0.5");
    const subtitleLines = subtitleRef.current.querySelectorAll('.subtitle-line');
    tl.from(subtitleLines, { y: 50, opacity: 0, duration: 1, stagger: 0.2, ease: "power3.out" }, "-=0.8");
    tl.from(scrollProgressRef.current, { opacity: 0, y: 50, duration: 1, ease: "power2.out" }, "-=0.5");
    return () => { tl.kill(); };
  }, [isReady]);

  React.useEffect(() => {
    const handleScroll = () => {
        const scrollY = window.scrollY;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        if (documentHeight <= windowHeight) return;
        const maxScroll = documentHeight - windowHeight;
        const progress = Math.min(scrollY / maxScroll, 1);
        setScrollProgress(progress);
        const newSection = Math.floor(progress * totalSections);
        setCurrentSection(newSection);
        const refs = threeRefs.current;
        if (!refs.nebula) return;
        const totalProgress = progress * totalSections;
        const sectionProgress = totalProgress % 1;
        const cameraPositions = [{ x: 0, y: 30, z: 300 }, { x: 0, y: 40, z: -50 }, { x: 0, y: 50, z: -700 }];
        const currentPos = cameraPositions[newSection] || cameraPositions[0];
        const nextPos = cameraPositions[newSection + 1] || currentPos;
        refs.targetCameraX = currentPos.x + (nextPos.x - currentPos.x) * sectionProgress;
        refs.targetCameraY = currentPos.y + (nextPos.y - currentPos.y) * sectionProgress;
        refs.targetCameraZ = currentPos.z + (nextPos.z - currentPos.z) * sectionProgress;
        refs.mountains.forEach((mountain, i) => {
            const speed = 1 + i * 0.9;
            const baseZ = mountain.userData.baseZ as number;
            const targetZ = baseZ + scrollY * speed * 0.5;
            if (refs.nebula) refs.nebula.position.z = (targetZ + progress * speed * 0.01) - 100;
            mountain.userData.targetZ = targetZ;
            if (progress > 0.7) mountain.position.z = 600000;
            else if (refs.locations[i] !== undefined) mountain.position.z = refs.locations[i];
        });
        if (refs.mountains[3]) refs.nebula.position.z = refs.mountains[3].position.z;
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isReady, totalSections]);

  const splitTitle = (text: string) => {
    return text.split('').map((char, i) => (
      <span key={i} className="title-char" style={{ display: 'inline-block' }}>{char === ' ' ? '\u00A0' : char}</span>
    ));
  };

  return (
    <div ref={containerRef} className="hero-container" style={{height: '300vh'}}>
      <canvas ref={canvasRef} className="webgl" />
      <Navbar />
      <div className="hero-content advibe-content">
        <h1 ref={titleRef} className="hero-title">{splitTitle('ADVIBE')}</h1>
        <div ref={subtitleRef} className="hero-subtitle advibe-subtitle">
          <p className="subtitle-line">Crafting campaigns that resonate,</p>
          <p className="subtitle-line">driving growth and brand success.</p>
        </div>
      </div>
      <div ref={scrollProgressRef} className="scroll-progress" style={{ visibility: 'hidden' }}>
        <div className="scroll-text">SCROLL</div>
        <div className="progress-track"><div className="progress-fill" style={{ width: `${scrollProgress * 100}%` }} /></div>
        <div className="section-counter">{String(currentSection + 1).padStart(2, '0')} / {String(totalSections + 1).padStart(2, '0')}</div>
      </div>
      <div className="scroll-sections">
        {[...Array(2)].map((_, i) => {
          const titles = ['INNOVATE', 'IMPACT'];
          const subtitles = [
            { line1: 'Unleashing creative potential,', line2: 'transforming ideas into captivating experiences.' },
            { line1: 'Measuring success, optimizing strategies,', line2: 'delivering tangible results for your brand.' }
          ];
          const title = titles[i] || 'DEFAULT';
          const subtitle = subtitles[i];
          return (subtitle && (<section key={i} className="content-section"><h1 className="hero-title">{splitTitle(title)}</h1><div className="hero-subtitle advibe-subtitle"><p className="subtitle-line">{subtitle.line1}</p><p className="subtitle-line">{subtitle.line2}</p></div></section>));
        })}
      </div>
    </div>
  );
};