import React, { useMemo } from 'react';
import { Platform } from 'react-native';
import { Canvas, Line, Rect, Text as SkText, matchFont, vec } from '@shopify/react-native-skia';
import { colors } from '@/theme/theme';

const FAMILY = Platform.select({ ios: 'Menlo', default: 'monospace' }) as string;

const prng = (seed: number) => {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

interface Props {
  text: string;
  width: number;
  fontSize?: number;
  color?: string;
  seed: number;
  align?: 'left' | 'center';
}

/**
 * Anti-OCR text: glyphs are drawn as Skia pixels (invisible to Accessibility / view-hierarchy scrapers),
 * each character gets a tiny kerning/baseline jitter, and a neon grid + speckle sits underneath.
 * Jitter is seeded so the card never flickers between re-renders.
 */
export const SkiaCard = ({ text, width, fontSize = 16, color = colors.text, seed, align = 'left' }: Props) => {
  const layout = useMemo(() => {
    const font = matchFont({ fontFamily: FAMILY, fontSize, fontWeight: 'bold' });
    const rnd = prng(seed);
    const lineH = fontSize * 1.5;
    const pad = 12;
    const maxW = width - pad * 2;
    const lines: string[] = [];
    let cur = '';
    for (const word of text.split(' ')) {
      const trial = cur ? `${cur} ${word}` : word;
      if (cur && font.measureText(trial).width > maxW) {
        lines.push(cur);
        cur = word;
      } else cur = trial;
    }
    if (cur) lines.push(cur);

    const glyphs: { ch: string; x: number; y: number }[] = [];
    lines.forEach((line, li) => {
      let x = align === 'center' ? pad + (maxW - font.measureText(line).width) / 2 : pad;
      for (const ch of line) {
        glyphs.push({ ch, x, y: pad + fontSize + li * lineH + (rnd() - 0.5) * 2.2 });
        x += font.measureText(ch).width + (rnd() - 0.4) * 1.6; // kerning jitter
      }
    });
    const height = pad * 2 + lines.length * lineH;
    const noise = Array.from({ length: 26 }, () => ({
      a: vec(rnd() * width, rnd() * height),
      b: vec(rnd() * width, rnd() * height),
      c: rnd() > 0.5 ? 'rgba(0,255,204,0.10)' : 'rgba(255,0,127,0.10)',
    }));
    const dots = Array.from({ length: 40 }, () => ({ x: rnd() * width, y: rnd() * height }));
    return { font, glyphs, height, noise, dots };
  }, [text, width, fontSize, seed, align]);

  return (
    <Canvas style={{ width, height: layout.height }} pointerEvents="none">
      <Rect x={0} y={0} width={width} height={layout.height} color="#0B0B1A" />
      {layout.noise.map((n, i) => <Line key={`n${i}`} p1={n.a} p2={n.b} color={n.c} strokeWidth={1} />)}
      {layout.dots.map((d, i) => <Rect key={`d${i}`} x={d.x} y={d.y} width={2} height={2} color="rgba(255,255,255,0.12)" />)}
      {layout.glyphs.map((g, i) => <SkText key={i} x={g.x} y={g.y} text={g.ch} font={layout.font} color={color} />)}
    </Canvas>
  );
};
