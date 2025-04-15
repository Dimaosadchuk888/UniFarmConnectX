import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface ConfettiEffectProps {
  active: boolean;
  onComplete?: () => void;
  duration?: number; // продолжительность в миллисекундах
  colors?: string[]; // цвета для конфетти
}

interface ConfettiParticle {
  x: number;
  y: number;
  size: number;
  color: string;
  rotation: number;
  speed: number;
}

const ConfettiEffect: React.FC<ConfettiEffectProps> = ({
  active,
  onComplete,
  duration = 3000,
  colors = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444']
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<ConfettiParticle[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  // Создаем конфетти частицы
  const createParticles = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const particles: ConfettiParticle[] = [];
    const particleCount = 100;
    
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: -20, // начинаем сверху
        size: Math.random() * 10 + 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        speed: Math.random() * 3 + 1
      });
    }
    
    particlesRef.current = particles;
  };
  
  // Анимируем конфетти
  const animateParticles = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const particles = particlesRef.current;
    let allFallen = true;
    
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      
      p.y += p.speed;
      p.rotation += 2;
      
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      
      ctx.restore();
      
      // Проверяем, все ли частицы вышли за пределы экрана
      if (p.y < canvas.height) {
        allFallen = false;
      }
    }
    
    if (allFallen) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (onComplete) onComplete();
    } else {
      animationFrameRef.current = requestAnimationFrame(animateParticles);
    }
  };
  
  useEffect(() => {
    if (!active) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Устанавливаем размеры холста
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Создаем и запускаем анимацию
    createParticles();
    animationFrameRef.current = requestAnimationFrame(animateParticles);
    
    // Ограничиваем длительность эффекта
    const timer = setTimeout(() => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (onComplete) onComplete();
    }, duration);
    
    return () => {
      clearTimeout(timer);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [active, duration, onComplete]);
  
  if (!active) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 pointer-events-none z-50"
    >
      <canvas ref={canvasRef} className="w-full h-full" />
    </motion.div>
  );
};

export default ConfettiEffect;