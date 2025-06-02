import React, { useEffect, useRef, useState } from 'react';

interface ConfettiEffectProps {
  active: boolean;
  onComplete?: () => void;
  duration?: number;
  colors?: string[];
  particleCount?: number;
  spread?: number;
  gravity?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  size: number;
  shape: 'square' | 'circle' | 'triangle';
  opacity: number;
  life: number;
  maxLife: number;
}

const ConfettiEffect: React.FC<ConfettiEffectProps> = ({
  active,
  onComplete,
  duration = 3000,
  colors = ['#A259FF', '#B368F7', '#6DBFFF', '#4BEF7C', '#FFD700', '#FF6B6B'],
  particleCount = 80,
  spread = 45,
  gravity = 0.3
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const particlesRef = useRef<Particle[]>([]);
  const startTimeRef = useRef<number>(0);
  const [isActive, setIsActive] = useState(false);

  // Создание частицы
  const createParticle = (x: number, y: number): Particle => {
    const angle = (Math.random() - 0.5) * spread * (Math.PI / 180);
    const velocity = Math.random() * 15 + 5;
    const shapes: Array<'square' | 'circle' | 'triangle'> = ['square', 'circle', 'triangle'];
    
    return {
      x,
      y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity - Math.random() * 10 - 5,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 4,
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      opacity: 1,
      life: 0,
      maxLife: Math.random() * 120 + 60
    };
  };

  // Инициализация частиц
  const initializeParticles = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const particles: Particle[] = [];
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    for (let i = 0; i < particleCount; i++) {
      particles.push(createParticle(centerX, centerY));
    }

    particlesRef.current = particles;
  };

  // Обновление частиц
  const updateParticles = () => {
    particlesRef.current = particlesRef.current.map(particle => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += gravity;
      particle.rotation += particle.rotationSpeed;
      particle.life++;
      
      // Затухание по времени жизни
      particle.opacity = Math.max(0, 1 - (particle.life / particle.maxLife));
      
      return particle;
    }).filter(particle => particle.life < particle.maxLife && particle.opacity > 0);
  };

  // Отрисовка частицы
  const drawParticle = (ctx: CanvasRenderingContext2D, particle: Particle) => {
    ctx.save();
    ctx.globalAlpha = particle.opacity;
    ctx.translate(particle.x, particle.y);
    ctx.rotate((particle.rotation * Math.PI) / 180);
    ctx.fillStyle = particle.color;

    const halfSize = particle.size / 2;

    switch (particle.shape) {
      case 'square':
        ctx.fillRect(-halfSize, -halfSize, particle.size, particle.size);
        break;
      case 'circle':
        ctx.beginPath();
        ctx.arc(0, 0, halfSize, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'triangle':
        ctx.beginPath();
        ctx.moveTo(0, -halfSize);
        ctx.lineTo(-halfSize, halfSize);
        ctx.lineTo(halfSize, halfSize);
        ctx.closePath();
        ctx.fill();
        break;
    }

    ctx.restore();
  };

  // Основной цикл анимации
  const animate = (currentTime: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    if (startTimeRef.current === 0) {
      startTimeRef.current = currentTime;
    }

    const elapsed = currentTime - startTimeRef.current;

    // Очистка canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Обновление и отрисовка частиц
    updateParticles();
    particlesRef.current.forEach(particle => {
      drawParticle(ctx, particle);
    });

    // Проверка завершения анимации
    if (elapsed < duration && particlesRef.current.length > 0) {
      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      setIsActive(false);
      onComplete?.();
    }
  };

  // Запуск анимации
  useEffect(() => {
    if (active && !isActive) {
      setIsActive(true);
      startTimeRef.current = 0;
      initializeParticles();
      animationFrameRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [active]);

  // Установка размеров canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    updateSize();
    window.addEventListener('resize', updateSize);

    return () => {
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  if (!active && !isActive) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
      style={{
        width: '100%',
        height: '100%'
      }}
    />
  );
};

export default ConfettiEffect;