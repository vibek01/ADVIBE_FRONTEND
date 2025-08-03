// This file tells TypeScript what to expect when we import from Three.js addons.
declare module 'three/examples/jsm/postprocessing/EffectComposer' {
  import { WebGLRenderer, Scene, Camera } from 'three';
  export class EffectComposer {
    constructor(renderer: WebGLRenderer);
    addPass(pass: any): void;
    render(): void;
    setSize(width: number, height: number): void;
  }
}

declare module 'three/examples/jsm/postprocessing/RenderPass' {
  import { Scene, Camera } from 'three';
  export class RenderPass {
    constructor(scene: Scene, camera: Camera);
  }
}

declare module 'three/examples/jsm/postprocessing/UnrealBloomPass' {
  import { Vector2 } from 'three';
  export class UnrealBloomPass {
    constructor(resolution: Vector2, strength: number, radius: number, threshold: number);
    strength: number;
    radius: number;
    threshold: number;
  }
}