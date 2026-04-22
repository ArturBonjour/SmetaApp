import { useEffect, useRef } from 'react';

const RULER_SIZE = 20;

interface RulerProps {
  direction: 'h' | 'v';
  stageOffset: { x: number; y: number };
  stageScale: number;
  worldScale: number; // pixels per meter (the scale constant, e.g. 60)
  length: number;     // ruler length in screen pixels
  isDark: boolean;
}

function drawRuler(
  canvas: HTMLCanvasElement,
  direction: 'h' | 'v',
  stageOffset: { x: number; y: number },
  stageScale: number,
  worldScale: number,
  isDark: boolean,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  // Background
  ctx.fillStyle = isDark ? '#141824' : '#f1f5f9';
  ctx.fillRect(0, 0, W, H);

  // Border line at the "inner" edge
  ctx.strokeStyle = isDark ? '#1e2d4a' : '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (direction === 'h') {
    ctx.moveTo(0, H - 1); ctx.lineTo(W, H - 1);
  } else {
    ctx.moveTo(W - 1, 0); ctx.lineTo(W - 1, H);
  }
  ctx.stroke();

  const pxPerMeter = worldScale * stageScale; // screen pixels per 1 world-meter

  // Adaptive step size (in meters)
  let step = 1;
  if (pxPerMeter < 12) step = 10;
  else if (pxPerMeter < 25) step = 5;
  else if (pxPerMeter < 50) step = 2;
  else if (pxPerMeter > 300) step = 0.25;
  else if (pxPerMeter > 150) step = 0.5;

  const offset = direction === 'h' ? stageOffset.x : stageOffset.y;
  const mainLen = direction === 'h' ? W : H;
  const startMeter = Math.floor(-offset / pxPerMeter / step) * step - step;
  const endMeter = startMeter + (mainLen / pxPerMeter) + step * 3;

  const majorColor = isDark ? '#94a3b8' : '#475569';
  const minorColor = isDark ? '#334155' : '#94a3b8';
  const textColor = isDark ? '#64748b' : '#475569';

  ctx.font = '9px system-ui, sans-serif';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';

  const fmt = (m: number) => {
    // Format: show integer meters
    if (Number.isInteger(m)) return `${m}`;
    return `${m.toFixed(1)}`;
  };

  for (let m = startMeter; m <= endMeter; m = parseFloat((m + step).toFixed(6))) {
    const pos = offset + m * pxPerMeter;
    if (pos < -2 || pos > mainLen + 2) continue;

    const isMajor = Math.abs(Math.round(m) - m) < 0.001;
    const tickLen = isMajor
      ? (direction === 'h' ? H * 0.6 : W * 0.6)
      : (direction === 'h' ? H * 0.3 : W * 0.3);

    ctx.strokeStyle = isMajor ? majorColor : minorColor;
    ctx.lineWidth = isMajor ? 1 : 0.5;
    ctx.beginPath();

    if (direction === 'h') {
      ctx.moveTo(pos, H - tickLen);
      ctx.lineTo(pos, H - 1);
    } else {
      ctx.moveTo(W - tickLen, pos);
      ctx.lineTo(W - 1, pos);
    }
    ctx.stroke();

    // Label only for major marks and if space allows
    if (isMajor && pxPerMeter * step > 18) {
      ctx.fillStyle = textColor;
      if (direction === 'h') {
        ctx.textAlign = 'center';
        ctx.fillText(fmt(m), pos, 2);
      } else {
        ctx.save();
        ctx.translate(W - tickLen - 2, pos);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.fillText(fmt(m), 0, 0);
        ctx.restore();
      }
    }
  }
}

export function CanvasRuler({ direction, stageOffset, stageScale, worldScale, length, isDark }: RulerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || length <= 0) return;

    canvas.width = direction === 'h' ? length : RULER_SIZE;
    canvas.height = direction === 'h' ? RULER_SIZE : length;

    drawRuler(canvas, direction, stageOffset, stageScale, worldScale, isDark);
  }, [direction, stageOffset.x, stageOffset.y, stageScale, worldScale, length, isDark]);

  const style: React.CSSProperties =
    direction === 'h'
      ? { position: 'absolute', top: 0, left: RULER_SIZE, width: length, height: RULER_SIZE, pointerEvents: 'none', zIndex: 10 }
      : { position: 'absolute', top: 0, left: 0, width: RULER_SIZE, height: length, pointerEvents: 'none', zIndex: 10 };

  return <canvas ref={canvasRef} style={style} />;
}

// Corner square where the two rulers meet
export function RulerCorner({ isDark }: { isDark: boolean }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: RULER_SIZE,
        height: RULER_SIZE,
        backgroundColor: isDark ? '#141824' : '#e2e8f0',
        borderRight: `1px solid ${isDark ? '#1e2d4a' : '#cbd5e1'}`,
        borderBottom: `1px solid ${isDark ? '#1e2d4a' : '#cbd5e1'}`,
        zIndex: 11,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
        <path d="M4 1L7 4L4 7L1 4Z" stroke={isDark ? '#475569' : '#94a3b8'} strokeWidth="1" fill="none" />
      </svg>
    </div>
  );
}

export { RULER_SIZE };
