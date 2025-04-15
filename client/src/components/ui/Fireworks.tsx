import React, { useState, useEffect } from 'react';

interface FireworksProps {
  active: boolean;
  onComplete?: () => void;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  color: string;
  speedX: number;
  speedY: number;
  opacity: number;
  rotation: number;
  rotationSpeed: number;
}

const Fireworks: React.FC<FireworksProps> = ({ active, onComplete }) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  
  // Создаем частицы при активации
  useEffect(() => {
    if (active) {
      createFireworks();
      
      // Автоматически завершаем через 1.5 секунды
      const timer = setTimeout(() => {
        if (onComplete) {
          onComplete();
        }
      }, 1500);
      
      return () => clearTimeout(timer);
    } else {
      setParticles([]);
    }
  }, [active, onComplete]);
  
  // Анимируем частицы
  useEffect(() => {
    if (particles.length === 0) return;
    
    let animationFrameId: number;
    
    const animate = () => {
      setParticles(prev => 
        prev
          .map(particle => ({
            ...particle,
            x: particle.x + particle.speedX,
            y: particle.y + particle.speedY,
            speedY: particle.speedY + 0.05, // Гравитация
            opacity: particle.opacity - 0.01, // Затухание
            rotation: particle.rotation + particle.rotationSpeed,
          }))
          .filter(particle => particle.opacity > 0) // Удаляем исчезнувшие частицы
      );
      
      animationFrameId = requestAnimationFrame(animate);
    };
    
    animationFrameId = requestAnimationFrame(animate);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [particles]);
  
  // Функция создания фейерверка
  const createFireworks = () => {
    const newParticles: Particle[] = [];
    const colors = [
      '#A259FF', // Фиолетовый
      '#7C4DFF',
      '#5E35B1',
      '#00E676', // Зеленый
      '#00C853',
      '#69F0AE',
      '#40C4FF', // Голубой
      '#00B0FF',
      '#4FC3F7',
    ];
    
    // Создаем множество частиц в центре экрана
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    
    // Для каждого типа фейерверка
    for (let burst = 0; burst < 3; burst++) {
      const offsetX = burst === 0 ? 0 : (burst === 1 ? -100 : 100);
      const offsetY = burst === 0 ? -50 : (burst === 1 ? 50 : 0);
      const delay = burst * 200; // мс задержки
      
      // Создаем частицы для этого взрыва
      setTimeout(() => {
        const burstParticles: Particle[] = [];
        
        for (let i = 0; i < 60; i++) {
          // Случайное направление 
          const angle = (Math.random() * Math.PI * 2);
          const speed = 1 + Math.random() * 5;
          
          burstParticles.push({
            x: centerX + offsetX,
            y: centerY + offsetY,
            size: 3 + Math.random() * 5,
            color: colors[Math.floor(Math.random() * colors.length)],
            speedX: Math.cos(angle) * speed,
            speedY: Math.sin(angle) * speed - 2, // Начальное движение вверх
            opacity: 1,
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 2,
          });
        }
        
        setParticles(prev => [...prev, ...burstParticles]);
      }, delay);
    }
  };
  
  if (!active) return null;
  
  return (
    <div 
      className="fixed inset-0 pointer-events-none z-50" 
      style={{ 
        perspective: '1000px',
      }}
    >
      {/* Светящийся фон */}
      <div 
        className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent opacity-50 animate-pulse" 
        style={{
          animation: 'fadeOut 1.5s forwards',
        }}
      ></div>
      
      {/* Частицы */}
      {particles.map((particle, index) => (
        <div
          key={index}
          className="absolute rounded-full"
          style={{
            left: `${particle.x}px`,
            top: `${particle.y}px`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            backgroundColor: particle.color,
            opacity: particle.opacity,
            filter: `blur(${particle.size / 10}px) brightness(1.2)`,
            boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`,
            transform: `rotate(${particle.rotation}deg) scale(${1 + (1 - particle.opacity) * 0.5})`,
            transition: 'transform 0.05s linear',
          }}
        />
      ))}
    </div>
  );
};

export default Fireworks;