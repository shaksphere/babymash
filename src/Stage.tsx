import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

export interface StageHandle {
  spawn: (x: number, y: number, label: string, seed: number) => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // 1 -> 0
  decay: number;
  size: number;
  rot: number;
  vr: number;
  color: string;
  label?: string; // big glyphs carry a label; confetti dots don't
  kind: 'glyph' | 'dot';
}

const COLORS = [
  '#ff595e', '#ff924c', '#ffca3a', '#8ac926', '#1982c4',
  '#6a4c93', '#ff66c4', '#00d2d3', '#f368e0', '#54a0ff',
];

function pick<T>(arr: T[], seed: number) {
  return arr[Math.abs(Math.floor(seed)) % arr.length];
}

export const Stage = forwardRef<StageHandle>(function Stage(_props, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);

  useImperativeHandle(ref, () => ({
    spawn(x, y, label, seed) {
      const color = pick(COLORS, seed);
      // the big bouncy glyph
      particles.current.push({
        x, y, vx: 0, vy: -0.4, life: 1, decay: 0.012,
        size: 90 + (Math.abs(seed) % 80), rot: (Math.random() - 0.5) * 0.6,
        vr: (Math.random() - 0.5) * 0.05, color, label, kind: 'glyph',
      });
      // a burst of confetti dots
      const n = 14;
      for (let i = 0; i < n; i++) {
        const a = (Math.PI * 2 * i) / n + Math.random();
        const sp = 4 + Math.random() * 7;
        particles.current.push({
          x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          life: 1, decay: 0.015 + Math.random() * 0.02,
          size: 8 + Math.random() * 14, rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.3, color: pick(COLORS, seed + i),
          kind: 'dot',
        });
      }
      // cap to keep things smooth under heavy mashing
      if (particles.current.length > 600) {
        particles.current.splice(0, particles.current.length - 600);
      }
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const loop = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const list = particles.current;
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        if (p.kind === 'dot') p.vy += 0.18; // gravity for confetti
        if (p.kind === 'glyph') p.vy -= 0.02; // glyphs drift up
        p.life -= p.decay;
        if (p.life <= 0) {
          list.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, p.life);
        if (p.kind === 'glyph' && p.label) {
          const scale = 0.6 + (1 - p.life) * 0.6;
          ctx.font = `900 ${p.size * scale}px "Baloo 2", system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 30 * p.life;
          ctx.fillText(p.label, 0, 0);
        } else {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.roundRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6, 4);
          ctx.fill();
        }
        ctx.restore();
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="stage-canvas" />;
});
