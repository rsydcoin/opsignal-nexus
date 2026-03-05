'use client';

import { useEffect, useRef } from 'react';

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Array<{
      x: number; y: number; vx: number; vy: number;
      size: number; opacity: number; color: string; life: number; maxLife: number;
    }> = [];

    const colors = ['#f59e0b', '#7b2ec8', '#00e5ff', '#fbbf24', '#9b4de8'];

    function createParticle() {
      return {
        x: Math.random() * canvas!.width,
        y: Math.random() * canvas!.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -Math.random() * 0.6 - 0.2,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.6 + 0.1,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 0,
        maxLife: Math.random() * 200 + 100,
      };
    }

    for (let i = 0; i < 80; i++) {
      particles.push(createParticle());
    }

    // Star field
    const stars: Array<{ x: number; y: number; size: number; opacity: number; twinkle: number }> = [];
    for (let i = 0; i < 200; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 1.5 + 0.3,
        opacity: Math.random() * 0.6 + 0.1,
        twinkle: Math.random() * Math.PI * 2,
      });
    }

    let animFrame: number;
    let tick = 0;

    function draw() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      tick++;

      // Draw star field
      stars.forEach(star => {
        const twinkleOpacity = star.opacity + Math.sin(tick * 0.01 + star.twinkle) * 0.1;
        ctx!.beginPath();
        ctx!.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(226, 217, 243, ${twinkleOpacity})`;
        ctx!.fill();
      });

      // Draw particles
      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life++;

        const lifeFrac = p.life / p.maxLife;
        const alpha = lifeFrac < 0.1 ? lifeFrac / 0.1 : lifeFrac > 0.8 ? (1 - lifeFrac) / 0.2 : 1;

        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx!.fillStyle = p.color;
        ctx!.globalAlpha = p.opacity * alpha;
        ctx!.fill();
        ctx!.globalAlpha = 1;

        if (p.life >= p.maxLife || p.y < -10) {
          particles[i] = createParticle();
          particles[i].y = canvas!.height + 10;
        }
      });

      animFrame = requestAnimationFrame(draw);
    }

    draw();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animFrame);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ opacity: 0.7 }}
    />
  );
}
