'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
const AnimatedBackground = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
      },
      vertexShader: `
        void main() {
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float iTime;
        uniform vec2 iResolution;

        #define NUM_OCTAVES 5

        float rand(vec2 n) {
          return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
        }

        float noise(vec2 p) {
          vec2 ip = floor(p);
          vec2 u = fract(p);
          u = u*u*(3.0-2.0*u);

          float res = mix(
            mix(rand(ip), rand(ip + vec2(1.0, 0.0)), u.x),
            mix(rand(ip + vec2(0.0, 1.0)), rand(ip + vec2(1.0, 1.0)), u.x), u.y);
          return res * res;
        }

        float fbm(vec2 x) {
          float v = 0.0;
          float a = 0.5;
          vec2 shift = vec2(100);
          mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
          for (int i = 0; i < NUM_OCTAVES; ++i) {
            v += a * noise(x);
            x = rot * x * 2.0 + shift;
            a *= 0.5;
          }
          return v;
        }

        void main() {
          vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;
          vec2 p = uv * 5.0;

          float time = iTime * 0.1;

          // Flowing waves
          float f = fbm(p + vec2(time * 0.5, time * 0.3));
          f += fbm(p * 2.0 + vec2(time * 0.8, time * 0.6)) * 0.5;
          f += fbm(p * 4.0 + vec2(time * 1.2, time * 0.9)) * 0.25;
          f = f * 0.5 + 0.5; // Normalize to 0-1

          // Vibrant gradient colors
          vec3 color1 = vec3(0.2, 0.0, 0.4); // Deep Purple
          vec3 color2 = vec3(0.8, 0.2, 0.6); // Bright Pink
          vec3 color3 = vec3(0.0, 0.6, 0.8); // Cyan
          vec3 color4 = vec3(0.9, 0.8, 0.1); // Yellow

          vec3 finalColor = mix(mix(color1, color2, f), mix(color3, color4, f), sin(time * 0.2 + uv.x * 0.5) * 0.5 + 0.5);

          // Add subtle particle effects
          float particleNoise = noise(uv * 50.0 + time * 10.0);
          finalColor += particleNoise * 0.05; // Subtle glow for particles

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    let frameId: number;
    const animate = () => {
      material.uniforms.iTime.value += 0.016;
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      material.uniforms.iResolution.value.set(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 z-0">
      {/* The shader will render directly into this div */}
    </div>
  );
};

export default AnimatedBackground;
