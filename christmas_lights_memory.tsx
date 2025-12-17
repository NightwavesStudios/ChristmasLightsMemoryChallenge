import React, { useState, useEffect, useRef } from 'react';
import { RotateCcw, Play } from 'lucide-react';

const COLORS = [
  { hex: '#FF3333', name: 'red' },
  { hex: '#33FF33', name: 'green' },
  { hex: '#3333FF', name: 'blue' },
  { hex: '#FFFF33', name: 'yellow' },
  { hex: '#FF33FF', name: 'magenta' },
  { hex: '#33FFFF', name: 'cyan' }
];

const ChristmasLightsMemory = () => {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('menu'); // menu, playing
  const [level, setLevel] = useState(1);
  const [sequence, setSequence] = useState([]);
  const [playerSequence, setPlayerSequence] = useState([]);
  const [phase, setPhase] = useState('ready');
  const [flashingIndex, setFlashingIndex] = useState(-1);
  const [flashProgress, setFlashProgress] = useState(0);
  const [score, setScore] = useState(0);
  const [doubleMode, setDoubleMode] = useState(false);
  const [repeatCooldown, setRepeatCooldown] = useState(0);
  const [draggedColor, setDraggedColor] = useState(null);
  const [dragPosition, setDragPosition] = useState(null);
  const [successParticles, setSuccessParticles] = useState([]);
  const [showWrong, setShowWrong] = useState(false);
  const snowflakesRef = useRef([]);

  const bulbCount = Math.min(level, 8);

  useEffect(() => {
    // Initialize snowflakes once
    if (snowflakesRef.current.length === 0) {
      snowflakesRef.current = Array(50).fill(0).map(() => ({
        x: Math.random() * 1000,
        y: Math.random() * 600,
        speed: 0.3 + Math.random() * 0.5,
        size: 1 + Math.random() * 2,
        opacity: 0.3 + Math.random() * 0.4
      }));
    }
  }, []);

  useEffect(() => {
    if (phase === 'ready' && gameState === 'playing') {
      const timer = setTimeout(() => {
        startNewRound();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [phase, gameState]);

  useEffect(() => {
    if (repeatCooldown > 0) {
      const timer = setTimeout(() => setRepeatCooldown(repeatCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [repeatCooldown]);

  const startGame = () => {
    setGameState('playing');
    setLevel(1);
    setScore(0);
    setPhase('ready');
  };

  const startNewRound = () => {
    const newSequence = Array(bulbCount).fill(0).map(() => 
      Math.floor(Math.random() * Math.min(4 + Math.floor(level / 2), 6))
    );
    setSequence(newSequence);
    setPlayerSequence(Array(bulbCount).fill(null));
    setPhase('flashing');
    setFlashingIndex(0);
    setFlashProgress(0);
  };

  const repeatSequence = () => {
    if (repeatCooldown === 0 && phase === 'input') {
      setRepeatCooldown(10);
      setPlayerSequence(Array(bulbCount).fill(null));
      setPhase('flashing');
      setFlashingIndex(0);
      setFlashProgress(0);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 1000 * dpr;
    canvas.height = 600 * dpr;
    canvas.style.width = '1000px';
    canvas.style.height = '600px';
    ctx.scale(dpr, dpr);

    let animationId;

    const animate = () => {
      ctx.clearRect(0, 0, 1000, 600);

      drawBackground(ctx);
      
      if (gameState === 'playing') {
        drawRailing(ctx);
        drawString(ctx);
        drawBulbs(ctx);
        drawSuccessParticles(ctx);
      } else {
        drawMenu(ctx);
      }

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [sequence, playerSequence, phase, flashingIndex, flashProgress, successParticles, gameState]);

  useEffect(() => {
    if (phase === 'flashing' && flashingIndex < sequence.length) {
      const totalDuration = 600;
      let progress = 0;

      const interval = setInterval(() => {
        progress += 16;
        const newProgress = progress / totalDuration;
        setFlashProgress(newProgress);

        if (progress >= totalDuration) {
          clearInterval(interval);
          setFlashingIndex(prev => prev + 1);
          setFlashProgress(0);
        }
      }, 16);

      return () => clearInterval(interval);
    } else if (phase === 'flashing' && flashingIndex >= sequence.length) {
      setTimeout(() => {
        setPhase('clear');
        setFlashingIndex(-1);
        setTimeout(() => {
          setPhase('input');
        }, 400);
      }, 500);
    }
  }, [phase, flashingIndex, sequence.length]);

  useEffect(() => {
    if (phase === 'input') {
      const filled = playerSequence.every(c => c !== null);
      if (filled) {
        setPhase('checking');
        checkSequence();
      }
    }
  }, [playerSequence, phase]);

  const checkSequence = () => {
    const correct = playerSequence.every((color, i) => color === sequence[i]);
    
    setTimeout(() => {
      if (correct) {
        setPhase('success');
        createSuccessParticles();
        const points = doubleMode ? level * 20 : level * 10;
        setScore(score + points);
        
        setTimeout(() => {
          setSuccessParticles([]);
          setLevel(prev => prev + 1);
          setDoubleMode(false);
          setPhase('ready');
        }, 2000);
      } else {
        setPhase('fail');
        
        setTimeout(() => {
          setPlayerSequence(Array(bulbCount).fill(null));
          setPhase('input');
        }, 1500);
      }
    }, 300);
  };

  const createSuccessParticles = () => {
    const particles = [];
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: 500 + (Math.random() - 0.5) * 200,
        y: 200 + (Math.random() - 0.5) * 100,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5,
        life: 1,
        color: COLORS[Math.floor(Math.random() * COLORS.length)].hex,
        size: Math.random() * 4 + 2
      });
    }
    setSuccessParticles(particles);
  };

  const drawSuccessParticles = (ctx) => {
    if (successParticles.length === 0) return;

    const updated = successParticles.map(p => ({
      ...p,
      x: p.x + p.vx,
      y: p.y + p.vy,
      life: p.life - 0.02
    })).filter(p => p.life > 0);

    setSuccessParticles(updated);

    updated.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  };

  const drawBackground = (ctx) => {
    // Sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 600);
    gradient.addColorStop(0, '#0a1128');
    gradient.addColorStop(0.3, '#1a2850');
    gradient.addColorStop(0.7, '#0f1b3d');
    gradient.addColorStop(1, '#050814');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1000, 600);

    // Stars
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for (let i = 0; i < 100; i++) {
      const x = (i * 137.5) % 1000;
      const y = (i * 73.3) % 600;
      const size = Math.random() * 1.5;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Animated snow
    snowflakesRef.current.forEach(flake => {
      flake.y += flake.speed;
      if (flake.y > 600) {
        flake.y = -10;
        flake.x = Math.random() * 1000;
      }

      ctx.save();
      ctx.globalAlpha = flake.opacity;
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(flake.x, flake.y, flake.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  };

  const drawMenu = (ctx) => {
    // Darken background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, 1000, 600);

    // Main title box
    ctx.fillStyle = 'rgba(20, 30, 50, 0.9)';
    ctx.fillRect(150, 100, 700, 400);

    // Golden border with glow
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#FFD700';
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 6;
    ctx.strokeRect(150, 100, 700, 400);
    ctx.shadowBlur = 0;

    // Decorative corners
    ctx.fillStyle = '#FFD700';
    const cornerSize = 15;
    // Top-left
    ctx.fillRect(150, 100, cornerSize * 3, cornerSize);
    ctx.fillRect(150, 100, cornerSize, cornerSize * 3);
    // Top-right
    ctx.fillRect(850 - cornerSize * 3, 100, cornerSize * 3, cornerSize);
    ctx.fillRect(850 - cornerSize, 100, cornerSize, cornerSize * 3);
    // Bottom-left
    ctx.fillRect(150, 500 - cornerSize, cornerSize * 3, cornerSize);
    ctx.fillRect(150, 500 - cornerSize * 3, cornerSize, cornerSize * 3);
    // Bottom-right
    ctx.fillRect(850 - cornerSize * 3, 500 - cornerSize, cornerSize * 3, cornerSize);
    ctx.fillRect(850 - cornerSize, 500 - cornerSize * 3, cornerSize, cornerSize * 3);

    // Title with gradient
    const titleGradient = ctx.createLinearGradient(500, 160, 500, 200);
    titleGradient.addColorStop(0, '#FFD700');
    titleGradient.addColorStop(0.5, '#FFF');
    titleGradient.addColorStop(1, '#FFD700');
    ctx.fillStyle = titleGradient;
    ctx.font = 'bold 56px Arial';
    ctx.textAlign = 'center';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#FFD700';
    ctx.fillText('Christmas Lights', 500, 200);
    ctx.shadowBlur = 0;
    
    // Subtitle
    ctx.fillStyle = '#88CCFF';
    ctx.font = 'italic 28px Arial';
    ctx.fillText('Memory Challenge', 500, 245);

    // Draw animated bulbs decoration
    const time = Date.now() * 0.001;
    const bulbY = 290;
    const bulbColors = ['#FF3333', '#33FF33', '#3333FF', '#FFFF33'];
    for (let i = 0; i < 5; i++) {
      const x = 300 + i * 100;
      const color = bulbColors[i % bulbColors.length];
      const glow = 0.5 + Math.sin(time * 2 + i) * 0.5;
      
      // Glow
      ctx.shadowBlur = 20 * glow;
      ctx.shadowColor = color;
      const bulbGradient = ctx.createRadialGradient(x, bulbY, 0, x, bulbY, 15);
      bulbGradient.addColorStop(0, color);
      bulbGradient.addColorStop(1, color + '88');
      ctx.fillStyle = bulbGradient;
      ctx.beginPath();
      ctx.arc(x, bulbY, 15, 0, Math.PI * 2);
      ctx.fill();
      
      // Bulb
      ctx.shadowBlur = 0;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, bulbY, 12, 0, Math.PI * 2);
      ctx.fill();
      
      // Highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.arc(x - 4, bulbY - 4, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Instructions
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '20px Arial';
    ctx.fillText('Watch the lights flash in sequence', 500, 360);
    ctx.fillText('Then recreate the pattern from memory', 500, 390);
    
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 22px Arial';
    ctx.fillText('🎨 Color is everything! 🎨', 500, 430);

    // Click to start hint
    const alpha = 0.5 + Math.sin(time * 3) * 0.5;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#88FF88';
    ctx.font = 'bold 18px Arial';
    ctx.fillText('Click anywhere to start!', 500, 470);
    ctx.globalAlpha = 1;
  };

  const drawRailing = (ctx) => {
    ctx.save();
    
    // Wood texture
    const gradient = ctx.createLinearGradient(0, 150, 0, 280);
    gradient.addColorStop(0, '#4a2f1a');
    gradient.addColorStop(0.2, '#5d3a21');
    gradient.addColorStop(0.5, '#6b4423');
    gradient.addColorStop(0.8, '#5d3a21');
    gradient.addColorStop(1, '#3d2412');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(80, 150, 840, 130);
    
    // Wood grain lines
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 15; i++) {
      ctx.beginPath();
      ctx.moveTo(80, 160 + i * 10);
      ctx.lineTo(920, 160 + i * 10 + Math.random() * 5);
      ctx.stroke();
    }
    
    // Border shadow
    ctx.strokeStyle = '#2d1a0d';
    ctx.lineWidth = 8;
    ctx.strokeRect(80, 150, 840, 130);
    
    // Inner highlight
    ctx.strokeStyle = 'rgba(139, 90, 43, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(88, 158, 824, 114);
    
    ctx.restore();
  };

  const drawString = (ctx) => {
    // Wire with realistic curve
    ctx.strokeStyle = '#2d4a2d';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetY = 2;
    
    ctx.beginPath();
    const startX = 150;
    const endX = 850;
    const spacing = (endX - startX) / (bulbCount + 1);
    
    for (let i = 0; i <= bulbCount + 1; i++) {
      const x = startX + i * spacing;
      const y = 185 + Math.sin(i * 0.5) * 2; // Slight curve
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  };

  const drawBulbs = (ctx) => {
    const startX = 150;
    const endX = 850;
    const spacing = (endX - startX) / (bulbCount + 1);
    const bulbY = 220;

    for (let i = 0; i < bulbCount; i++) {
      const x = startX + (i + 1) * spacing;
      
      // Wire from string to bulb
      ctx.strokeStyle = '#2d4a2d';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 185 + Math.sin((i + 1) * 0.5) * 2);
      ctx.lineTo(x, bulbY - 20);
      ctx.stroke();

      // Socket
      ctx.fillStyle = '#3a3a3a';
      ctx.fillRect(x - 6, bulbY - 22, 12, 8);
      ctx.strokeStyle = '#2a2a2a';
      ctx.lineWidth = 1;
      ctx.strokeRect(x - 6, bulbY - 22, 12, 8);

      let glowIntensity = 0;
      let bulbColor = '#1a1a1a';

      if (phase === 'flashing' && flashingIndex === i) {
        const easeProgress = flashProgress < 0.3 ? flashProgress / 0.3 : 
                           flashProgress < 0.7 ? 1 :
                           1 - (flashProgress - 0.7) / 0.3;
        glowIntensity = easeProgress;
        bulbColor = COLORS[sequence[i]].hex;
      } else if ((phase === 'input' || phase === 'checking') && playerSequence[i] !== null) {
        glowIntensity = 0.7;
        bulbColor = COLORS[playerSequence[i]].hex;
      } else if (phase === 'success') {
        glowIntensity = 0.6 + Math.sin(Date.now() * 0.005) * 0.4;
        bulbColor = COLORS[sequence[i]].hex;
      } else if (phase === 'fail' && playerSequence[i] !== sequence[i]) {
        glowIntensity = 0.2;
        bulbColor = '#444';
      }

      // Outer glow
      if (glowIntensity > 0.1) {
        ctx.save();
        ctx.shadowBlur = 35 * glowIntensity;
        ctx.shadowColor = bulbColor;
        
        const outerGlow = ctx.createRadialGradient(x, bulbY, 0, x, bulbY, 25);
        outerGlow.addColorStop(0, bulbColor);
        outerGlow.addColorStop(0.5, bulbColor + '66');
        outerGlow.addColorStop(1, bulbColor + '00');
        
        ctx.fillStyle = outerGlow;
        ctx.beginPath();
        ctx.arc(x, bulbY, 25 * (1 + glowIntensity * 0.3), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Bulb body
      ctx.save();
      const bulbGradient = ctx.createRadialGradient(x - 5, bulbY - 5, 0, x, bulbY, 18);
      if (glowIntensity > 0.1) {
        bulbGradient.addColorStop(0, bulbColor);
        bulbGradient.addColorStop(0.7, bulbColor);
        bulbGradient.addColorStop(1, bulbColor + 'AA');
      } else {
        bulbGradient.addColorStop(0, '#2a2a2a');
        bulbGradient.addColorStop(1, '#1a1a1a');
      }
      
      ctx.fillStyle = bulbGradient;
      ctx.beginPath();
      ctx.arc(x, bulbY, 18, 0, Math.PI * 2);
      ctx.fill();

      // Glass reflection
      const highlight = ctx.createRadialGradient(x - 7, bulbY - 7, 0, x - 3, bulbY - 3, 12);
      highlight.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
      highlight.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
      highlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = highlight;
      ctx.beginPath();
      ctx.arc(x, bulbY, 18, 0, Math.PI * 2);
      ctx.fill();

      // Outline
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, bulbY, 18, 0, Math.PI * 2);
      ctx.stroke();
      
      ctx.restore();
    }
  };

  const handleCanvasClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (gameState === 'menu') {
      startGame();
      return;
    }

    if (phase !== 'input' || draggedColor === null) return;

    const startX = 150;
    const endX = 850;
    const spacing = (endX - startX) / (bulbCount + 1);
    const bulbY = 220;

    for (let i = 0; i < bulbCount; i++) {
      const bulbX = startX + (i + 1) * spacing;
      const distance = Math.sqrt((x - bulbX) ** 2 + (y - bulbY) ** 2);

      if (distance < 25 && playerSequence[i] === null) {
        const newSeq = [...playerSequence];
        newSeq[i] = draggedColor;
        setPlayerSequence(newSeq);
        setDraggedColor(null);
        setDragPosition(null);
        break;
      }
    }
  };

  const handleMouseMove = (e) => {
    if (draggedColor !== null) {
      const rect = canvasRef.current.getBoundingClientRect();
      setDragPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {gameState === 'playing' && (
        <div className="flex items-center gap-8 mb-8 z-10">
          <div className="bg-gradient-to-br from-yellow-500 to-amber-600 px-10 py-5 rounded-3xl shadow-2xl border-4 border-yellow-400">
            <div className="text-white text-5xl font-black">{level}</div>
          </div>

          {level > 1 && (
            <label className="bg-gradient-to-br from-purple-500 to-violet-600 px-8 py-5 rounded-3xl shadow-2xl border-4 border-purple-400 cursor-pointer hover:scale-105 transition-transform">
              <input
                type="checkbox"
                checked={doubleMode}
                onChange={(e) => setDoubleMode(e.target.checked)}
                className="w-7 h-7 mr-3"
              />
              <span className="text-white text-2xl font-bold">×2</span>
            </label>
          )}
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="rounded-2xl shadow-2xl cursor-pointer"
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setDragPosition(null)}
      />

      {gameState === 'menu' && (
        <div className="mt-8 text-center z-10">
          <div className="text-white text-xl mb-2 opacity-75">
            A color-based memory game
          </div>
          <div className="text-blue-300 text-sm">
            For the SkillUp Christmas Game Jam 2025
          </div>
        </div>
      )}

      {gameState === 'playing' && phase === 'input' && (
        <div className="mt-8 z-10">
          <div className="flex gap-6 justify-center items-center mb-6">
            {COLORS.slice(0, Math.min(4 + Math.floor(level / 2), 6)).map((color, i) => (
              <div
                key={i}
                onClick={() => setDraggedColor(draggedColor === i ? null : i)}
                className={`cursor-pointer transition-all ${
                  draggedColor === i ? 'scale-125 ring-4 ring-white' : 'hover:scale-110'
                }`}
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  backgroundColor: color.hex,
                  boxShadow: `0 0 20px ${color.hex}, 0 4px 6px rgba(0,0,0,0.3)`,
                  border: '4px solid rgba(255,255,255,0.4)',
                }}
              />
            ))}
          </div>

          <div className="flex justify-center">
            <button
              onClick={repeatSequence}
              disabled={repeatCooldown > 0}
              className={`flex items-center gap-3 px-10 py-5 rounded-3xl font-bold text-2xl shadow-xl transition-all ${
                repeatCooldown > 0
                  ? 'bg-gray-600 cursor-not-allowed opacity-50'
                  : 'bg-gradient-to-br from-blue-500 to-blue-700 hover:scale-105 border-4 border-blue-400'
              }`}
            >
              <RotateCcw size={28} className="text-white" />
              <span className="text-white">
                {repeatCooldown > 0 ? repeatCooldown : 'REPEAT'}
              </span>
            </button>
          </div>
        </div>
      )}

      {dragPosition && draggedColor !== null && (
        <div
          className="fixed pointer-events-none z-50"
          style={{
            left: dragPosition.x + canvasRef.current?.getBoundingClientRect().left - 25,
            top: dragPosition.y + canvasRef.current?.getBoundingClientRect().top - 25,
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            backgroundColor: COLORS[draggedColor].hex,
            boxShadow: `0 0 30px ${COLORS[draggedColor].hex}`,
            border: '4px solid rgba(255,255,255,0.6)',
          }}
        />
      )}
    </div>
  );
};

export default ChristmasLightsMemory;