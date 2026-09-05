import React, { useEffect, useRef, useState } from 'react';
import { DisplayState, FaceExpression } from '../types';
import { Play, Pause, RefreshCw, Cpu, Monitor } from 'lucide-react';

interface OledSimulatorProps {
  state: DisplayState;
  onStateChange?: (state: DisplayState) => void;
  networkSSID?: string;
  networkIP?: string;
  rssi?: number;
  message?: string;
  otaProgress?: number;
  className?: string;
}

export const OledSimulator: React.FC<OledSimulatorProps> = ({
  state,
  onStateChange,
  networkSSID = 'Explore AI',
  networkIP = '192.168.4.1',
  rssi = -62,
  message = '',
  otaProgress = 45,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [scale, setScale] = useState(3); // 128x64 scaled up to 384x192
  const frameRef = useRef(0);

  // Constants
  const WIDTH = 128;
  const HEIGHT = 64;

  useEffect(() => {
    let animationId: number;
    let lastBlink = Date.now();
    let isBlinking = false;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Turn off smoothing for authentic crisp OLED pixel look
    ctx.imageSmoothingEnabled = false;

    const render = () => {
      frameRef.current++;
      const frame = frameRef.current;
      const now = Date.now();

      // Blink timer for idle/ready
      if (state === 'READY' || state === 'BOOT') {
        if (!isBlinking && now - lastBlink > 3200) {
          isBlinking = true;
          lastBlink = now;
        } else if (isBlinking && now - lastBlink > 160) {
          isBlinking = false;
          lastBlink = now;
        }
      } else {
        isBlinking = false;
      }

      // 1. Clear display (OLED dark background)
      ctx.fillStyle = '#050810';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // Pixel color: Bright cyan-tinted monochrome OLED
      const OLED_COLOR = '#38bdf8';
      ctx.fillStyle = OLED_COLOR;
      ctx.strokeStyle = OLED_COLOR;
      ctx.lineWidth = 1;

      // Draw Top Status Bar (Except boot and factory reset)
      if (state !== 'BOOT' && state !== 'FACTORY_RESET') {
        ctx.beginPath();
        ctx.moveTo(0, 10.5);
        ctx.lineTo(WIDTH, 10.5);
        ctx.stroke();

        ctx.font = '7px monospace';
        ctx.fillText('EXPLORE AI', 2, 8);

        // Network indication
        if (state === 'WIFI_SETUP' || networkIP === '192.168.4.1') {
          ctx.fillText('AP', 108, 8);
        } else {
          ctx.fillText('WiFi', 84, 8);
          // Signal bars
          const bars = Math.max(1, Math.min(4, Math.floor((rssi + 90) / 15)));
          for (let i = 0; i < 4; i++) {
            if (i < bars) {
              ctx.fillRect(110 + i * 3, 8 - (i * 2), 2, i * 2 + 1);
            }
          }
        }
      }

      // Helper functions for face rendering
      const drawEye = (x: number, y: number, w: number, h: number, pupilDx = 0, pupilDy = 0) => {
        if (h <= 2) {
          // Blink slit
          ctx.fillRect(x - w / 2, y, w, 2);
          return;
        }
        // Outer eye
        const r = Math.min(w, h) / 2;
        ctx.beginPath();
        ctx.roundRect(x - w / 2, y - h / 2, w, h, r);
        ctx.fill();

        // Inner pupil cutout
        const pupilR = Math.max(2, w / 4);
        ctx.fillStyle = '#050810';
        ctx.beginPath();
        ctx.arc(x + pupilDx, y + pupilDy, pupilR, 0, Math.PI * 2);
        ctx.fill();

        // Reflection glint
        ctx.fillStyle = OLED_COLOR;
        ctx.fillRect(x + pupilDx - 1, y + pupilDy - 1, 1, 1);
      };

      const drawMouth = (x: number, y: number, w: number, expr: FaceExpression) => {
        ctx.fillStyle = OLED_COLOR;
        ctx.strokeStyle = OLED_COLOR;

        if (expr === 'SPEAKING') {
          const mouthH = 3 + Math.abs((frame % 16) - 8);
          ctx.beginPath();
          ctx.roundRect(x - w / 2, y - mouthH / 2, w, mouthH, mouthH / 2);
          ctx.fill();
        } else if (expr === 'LISTENING') {
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.stroke();
        } else if (expr === 'THINKING') {
          ctx.beginPath();
          ctx.moveTo(x - w / 2 + 3, y - 1);
          ctx.lineTo(x + w / 2 - 3, y + 1);
          ctx.stroke();
        } else if (expr === 'ERROR') {
          ctx.beginPath();
          ctx.moveTo(x - w / 2, y + 2);
          ctx.lineTo(x + w / 2, y + 2);
          ctx.stroke();
        } else if (expr === 'SLEEP') {
          ctx.fillRect(x - w / 3, y, (w * 2) / 3, 1);
        } else {
          // Smile
          ctx.beginPath();
          ctx.moveTo(x - w / 2 + 2, y);
          ctx.lineTo(x + w / 2 - 2, y);
          ctx.stroke();
          ctx.fillRect(x - w / 2, y - 1, 1, 1);
          ctx.fillRect(x + w / 2 - 1, y - 1, 1, 1);
        }
      };

      // 2. Render Specific State
      switch (state) {
        case 'BOOT': {
          ctx.beginPath();
          ctx.arc(64, 22, 14, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(64, 22, 10, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(64, 22, 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.font = '8px monospace';
          ctx.fillText('EXPLORE AI OS', 26, 46);
          ctx.font = '6px monospace';
          ctx.fillText('v1.0.0 ESP32-S3', 34, 56);
          break;
        }

        case 'WIFI_SETUP': {
          ctx.font = '7px monospace';
          ctx.fillText('Wi-Fi Setup Mode', 4, 20);

          ctx.beginPath();
          ctx.roundRect(4, 24, 120, 36, 4);
          ctx.stroke();

          ctx.fillText('AP: Explore AI', 8, 35);
          ctx.fillText('IP: 192.168.4.1', 8, 45);
          ctx.fillText('Open Web Browser', 8, 55);
          break;
        }

        case 'WIFI_CONNECTING': {
          ctx.font = '7px monospace';
          ctx.fillText('Connecting Wi-Fi...', 4, 22);
          ctx.fillText(`SSID: ${networkSSID.slice(0, 14)}`, 4, 34);

          // Animated spinner
          const cx = 64;
          const cy = 48;
          const r = 7;
          const angle = (frame % 16) * (Math.PI / 8);
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, 2, 0, Math.PI * 2);
          ctx.fill();
          break;
        }

        case 'WIFI_CONNECTED':
        case 'CLOUD_CONNECTING': {
          ctx.font = '7px monospace';
          ctx.fillText('Wi-Fi Connected!', 4, 22);
          ctx.fillText(`IP: ${networkIP}`, 4, 34);
          ctx.fillText('Connecting Cloud...', 4, 46);
          break;
        }

        case 'READY': {
          const eyeH = isBlinking ? 2 : 28;
          drawEye(42, 28, 20, eyeH);
          drawEye(86, 28, 20, eyeH);
          drawMouth(64, 50, 24, 'IDLE');
          break;
        }

        case 'LISTENING': {
          // Attentive wide eyes
          drawEye(42, 28, 22, 30);
          drawEye(86, 28, 22, 30);
          drawMouth(64, 52, 20, 'LISTENING');

          // Audio side bars
          const wavePhase = Math.floor(frame / 4) % 3;
          ctx.fillRect(14, 24 - wavePhase * 2, 2, 16 + wavePhase * 4);
          ctx.fillRect(112, 24 - wavePhase * 2, 2, 16 + wavePhase * 4);
          break;
        }

        case 'PROCESSING': {
          // Pensive eyes shifted up
          const shift = (Math.floor(frame / 6) % 2 === 0) ? -2 : 2;
          drawEye(42, 28, 20, 24, shift, -4);
          drawEye(86, 28, 20, 24, shift, -4);
          drawMouth(64, 50, 24, 'THINKING');

          // Thinking orbiting dot
          const orbitX = 64 + ((frame % 12) - 6) * 4;
          ctx.beginPath();
          ctx.arc(orbitX, 14, 2, 0, Math.PI * 2);
          ctx.fill();
          break;
        }

        case 'SPEAKING': {
          // Dynamic bouncing face
          const bounce = (frame % 4 === 0) ? 1 : 0;
          drawEye(42, 27 + bounce, 20, 26);
          drawEye(86, 27 + bounce, 20, 26);
          drawMouth(64, 49 + bounce, 26, 'SPEAKING');
          break;
        }

        case 'ERROR': {
          // Crossed eyes
          ctx.beginPath();
          ctx.moveTo(34, 20); ctx.lineTo(50, 36);
          ctx.moveTo(50, 20); ctx.lineTo(34, 36);
          ctx.moveTo(78, 20); ctx.lineTo(94, 36);
          ctx.moveTo(94, 20); ctx.lineTo(78, 36);
          ctx.stroke();

          drawMouth(64, 48, 24, 'ERROR');
          ctx.font = '6px monospace';
          ctx.fillText(message || 'ERROR_WIFI_TIMEOUT', 4, 60);
          break;
        }

        case 'OTA': {
          ctx.font = '7px monospace';
          ctx.fillText('OTA Firmware Update', 14, 24);

          ctx.strokeRect(14, 32, 100, 10);
          const fillW = Math.floor((otaProgress * 96) / 100);
          ctx.fillRect(16, 34, fillW, 6);

          ctx.fillText(`${otaProgress}%`, 54, 52);
          break;
        }

        case 'SLEEP': {
          ctx.fillRect(32, 28, 20, 2);
          ctx.fillRect(76, 28, 20, 2);
          drawMouth(64, 48, 20, 'SLEEP');

          const zPhase = Math.floor(frame / 8) % 3;
          ctx.font = '7px monospace';
          ctx.fillText('z', 98 + zPhase * 6, 20 - zPhase * 3);
          break;
        }

        case 'FACTORY_RESET': {
          ctx.strokeRect(0, 0, WIDTH, HEIGHT);
          ctx.font = '7px monospace';
          ctx.fillText('FACTORY RESET?', 18, 18);
          ctx.fillText('Release to Cancel', 8, 32);
          ctx.fillText('Resetting in 3s...', 12, 46);
          break;
        }
      }

      if (isPlaying) {
        animationId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [state, isPlaying, networkSSID, networkIP, rssi, message, otaProgress]);

  const allStates: DisplayState[] = [
    'READY',
    'LISTENING',
    'PROCESSING',
    'SPEAKING',
    'WIFI_SETUP',
    'WIFI_CONNECTING',
    'WIFI_CONNECTED',
    'BOOT',
    'ERROR',
    'OTA',
    'SLEEP',
    'FACTORY_RESET'
  ];

  return (
    <div className={`flex flex-col items-center bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl ${className}`}>
      {/* Device Bezel */}
      <div className="relative p-3 bg-slate-950 rounded-xl border border-slate-800 shadow-2xl shadow-cyan-950/20">
        <div className="flex items-center justify-between px-1 pb-2 border-b border-slate-900 text-xs text-slate-400">
          <div className="flex items-center gap-1.5 font-mono">
            <Monitor className="w-3.5 h-3.5 text-cyan-400" />
            <span>SSD1306 OLED (128x64 I2C)</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/60 text-cyan-300 font-mono border border-cyan-800/40">
            0x3C
          </span>
        </div>

        {/* OLED Glass Canvas */}
        <div className="mt-2 bg-[#050810] p-1.5 rounded-lg border border-cyan-950/40 shadow-inner flex justify-center">
          <canvas
            ref={canvasRef}
            width={WIDTH}
            height={HEIGHT}
            style={{
              width: `${WIDTH * scale}px`,
              height: `${HEIGHT * scale}px`,
              imageRendering: 'pixelated'
            }}
            className="rounded filter drop-shadow-[0_0_8px_rgba(56,189,248,0.2)]"
          />
        </div>

        {/* Display Status Bar */}
        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span>Active State: <strong className="text-cyan-300">{state}</strong></span>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>
        </div>
      </div>

      {/* Interactive State Quick Selector */}
      {onStateChange && (
        <div className="w-full mt-4">
          <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>Test Firmware State Machine:</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
            {allStates.map((s) => (
              <button
                key={s}
                onClick={() => onStateChange(s)}
                className={`text-[11px] font-mono px-2 py-1.5 rounded-lg border transition text-center truncate ${
                  state === s
                    ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-200 font-bold shadow-sm'
                    : 'bg-slate-800/60 border-slate-750 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
                title={s}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
