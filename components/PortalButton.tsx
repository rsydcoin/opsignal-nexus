'use client';

import Link from 'next/link';
import { useState } from 'react';

interface PortalButtonProps {
  href: string;
  icon: string;
  label: string;
  subtitle: string;
  color?: 'gold' | 'purple' | 'cyan' | 'emerald' | 'red';
}

const colorMap = {
  gold: {
    border: 'rgba(245,158,11,0.4)',
    glow: 'rgba(245,158,11,0.25)',
    glowHover: 'rgba(245,158,11,0.5)',
    text: '#fbbf24',
    bg: 'rgba(245,158,11,0.08)',
    ring: '#f59e0b',
  },
  purple: {
    border: 'rgba(123,46,200,0.4)',
    glow: 'rgba(123,46,200,0.25)',
    glowHover: 'rgba(123,46,200,0.5)',
    text: '#c087f5',
    bg: 'rgba(123,46,200,0.08)',
    ring: '#7b2ec8',
  },
  cyan: {
    border: 'rgba(0,229,255,0.3)',
    glow: 'rgba(0,229,255,0.15)',
    glowHover: 'rgba(0,229,255,0.4)',
    text: '#00e5ff',
    bg: 'rgba(0,229,255,0.05)',
    ring: '#00e5ff',
  },
  emerald: {
    border: 'rgba(0,230,118,0.3)',
    glow: 'rgba(0,230,118,0.15)',
    glowHover: 'rgba(0,230,118,0.4)',
    text: '#00e676',
    bg: 'rgba(0,230,118,0.05)',
    ring: '#00e676',
  },
  red: {
    border: 'rgba(255,23,68,0.3)',
    glow: 'rgba(255,23,68,0.15)',
    glowHover: 'rgba(255,23,68,0.4)',
    text: '#ff6b6b',
    bg: 'rgba(255,23,68,0.05)',
    ring: '#ff1744',
  },
};

export default function PortalButton({ href, icon, label, subtitle, color = 'gold' }: PortalButtonProps) {
  const [hovered, setHovered] = useState(false);
  const c = colorMap[color];

  return (
    <Link href={href}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          border: `1px solid ${hovered ? c.border.replace('0.4', '0.8') : c.border}`,
          boxShadow: hovered
            ? `0 0 30px ${c.glowHover}, 0 0 60px ${c.glow}, inset 0 0 20px ${c.bg}`
            : `0 0 15px ${c.glow}, inset 0 0 10px ${c.bg}`,
          background: hovered
            ? `linear-gradient(135deg, rgba(7,17,51,0.95), rgba(26,10,46,0.95), ${c.bg})`
            : `linear-gradient(135deg, rgba(7,17,51,0.85), rgba(26,10,46,0.85))`,
          transform: hovered ? 'translateY(-4px) scale(1.02)' : 'translateY(0) scale(1)',
          transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
        className="relative rounded-xl p-5 cursor-pointer overflow-hidden group"
      >
        {/* Radial portal glow */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: `radial-gradient(ellipse at 50% 50%, ${c.bg} 0%, transparent 70%)`,
          }}
        />

        {/* Corner runes */}
        <div className="absolute top-1.5 left-2 text-[8px] font-mono opacity-30" style={{ color: c.text }}>◈</div>
        <div className="absolute top-1.5 right-2 text-[8px] font-mono opacity-30" style={{ color: c.text }}>◈</div>
        <div className="absolute bottom-1.5 left-2 text-[8px] font-mono opacity-30" style={{ color: c.text }}>◈</div>
        <div className="absolute bottom-1.5 right-2 text-[8px] font-mono opacity-30" style={{ color: c.text }}>◈</div>

        {/* Icon */}
        <div className="relative z-10 flex flex-col items-center gap-3">
          <div
            className="text-4xl transition-transform duration-300"
            style={{ transform: hovered ? 'scale(1.15) translateY(-2px)' : 'scale(1)' }}
          >
            {icon}
          </div>

          <div className="text-center">
            <div
              className="font-display text-sm font-bold tracking-widest uppercase transition-all duration-300"
              style={{
                color: c.text,
                textShadow: hovered ? `0 0 12px ${c.ring}` : 'none',
              }}
            >
              {label}
            </div>
            <div className="font-body text-xs text-purple-300/70 mt-0.5 italic">
              {subtitle}
            </div>
          </div>

          {/* Bottom energy bar */}
          <div
            className="w-full h-px transition-all duration-300"
            style={{
              background: hovered
                ? `linear-gradient(90deg, transparent, ${c.ring}, transparent)`
                : `linear-gradient(90deg, transparent, ${c.border}, transparent)`,
            }}
          />
        </div>
      </div>
    </Link>
  );
}
