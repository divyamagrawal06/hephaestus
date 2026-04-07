import { useEffect, useRef } from "react";
import { useReducedMotion } from "../hooks/useReducedMotion";

export const DistortionOverlay = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl");
    if (!gl) return;

    const vertexSrc = `
      attribute vec2 aPosition;
      varying vec2 vUv;
      void main() {
        vUv = (aPosition + 1.0) * 0.5;
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `;
    const fragmentSrc = `
      precision mediump float;
      varying vec2 vUv;
      uniform float uTime;
      uniform vec2 uPointer;
      float noise(vec2 p) {
        return sin(p.x) * sin(p.y);
      }
      void main() {
        vec2 uv = vUv;
        float dist = distance(uv, uPointer);
        float ripple = sin((uv.x + uv.y + uTime * 0.2) * 12.0);
        float grain = noise(uv * 40.0 + uTime);
        float glow = smoothstep(0.35, 0.0, dist) * 0.7;
        vec3 color = vec3(0.15, 1.0, 0.86) * glow;
        color += vec3(1.0, 0.45, 0.25) * ripple * 0.08;
        color += grain * 0.04;
        gl_FragColor = vec4(color, glow * 0.65);
      }
    `;

    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    };

    const vertexShader = compile(gl.VERTEX_SHADER, vertexSrc);
    const fragmentShader = compile(gl.FRAGMENT_SHADER, fragmentSrc);
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );

    const aPosition = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(program, "uTime");
    const uPointer = gl.getUniformLocation(program, "uPointer");
    let pointer = { x: 0.5, y: 0.5 };

    const resize = () => {
      canvas.width = window.innerWidth * window.devicePixelRatio;
      canvas.height = window.innerHeight * window.devicePixelRatio;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener("resize", resize);

    const onMove = (event: PointerEvent) => {
      pointer = {
        x: event.clientX / window.innerWidth,
        y: 1 - event.clientY / window.innerHeight,
      };
    };
    window.addEventListener("pointermove", onMove);

    let frame = 0;
    let animationId = 0;
    const tick = () => {
      frame += 1;
      gl.uniform1f(uTime, frame * 0.02);
      gl.uniform2f(uPointer, pointer.x, pointer.y);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animationId = window.requestAnimationFrame(tick);
    };
    animationId = window.requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.cancelAnimationFrame(animationId);
    };
  }, [reducedMotion]);

  if (reducedMotion) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[25] mix-blend-screen opacity-60"
    />
  );
};
