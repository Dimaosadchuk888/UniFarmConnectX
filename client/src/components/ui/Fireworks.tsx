import React, { useEffect, useRef, useState } from 'react';

interface FireworksProps {
  active: boolean;
  onComplete?: () => void;
  duration?: number;
  intensity?: 'low' | 'medium' | 'high';
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  gravity: number;
}

interface Explosion {
  x: number;
  y: number;
  sparks: Spark[];
  created: number;
}

const Fireworks: React.FC<FireworksProps> = ({
  active,
  onComplete,
  duration = 5000,
  intensity = 'medium'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const explosionsRef = useRef<Explosion[]>([]);
  const startTimeRef = useRef<number>(0);
  const [isActive, setIsActive] = useState(false);

  const colors = [
    '#A259FF', '#B368F7', '#6DBFFF', '#4BEF7C', 
    '#FFD700', '#FF6B6B', '#FF9500', '#00FF99'
  ];

  const getIntensitySettings = () => {
    switch (intensity) {
      case 'low':
        return { explosionCount: 3, sparkCount: 30, explosionInterval: 800 };
      case 'medium':
        return { explosionCount: 5, sparkCount: 50, explosionInterval: 600 };
      case 'high':
        return { explosionCount: 8, sparkCount: 80, explosionInterval: 400 };
      default:
        return { explosionCount: 5, sparkCount: 50, explosionInterval: 600 };
    }
  };

  const createSpark = (x: number, y: number): Spark => {
    const angle = Math.random() * Math.PI * 2;
    const velocity = Math.random() * 8 + 2;
    
    return {
      x,
      y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      life: 0,
      maxLife: Math.random() * 60 + 40,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 3 + 1,
      gravity: 0.1
    };
  };

  const createExplosion = (x: number, y: number): Explosion => {
    const settings = getIntensitySettings();
    const sparks: Spark[] = [];
    
    for (let i = 0; i < settings.sparkCount; i++) {
      sparks.push(createSpark(x, y));
    }
    
    return {
      x,
      y,
      sparks,
      created: Date.now()
    };
  };

  const updateExplosions = () => {
    explosionsRef.current = explosionsRef.current.map(explosion => {
      explosion.sparks = explosion.sparks.map(spark => {
        spark.x += spark.vx;
        spark.y += spark.vy;
        spark.vy += spark.gravity;
        spark.vx *= 0.99; // трение
        spark.life++;
        
        return spark;
      }).filter(spark => spark.life < spark.maxLife);
      
      return explosion;
    }).filter(explosion => explosion.sparks.length > 0);
  };

  const drawSpark = (ctx: CanvasRenderingContext2D, spark: Spark) => {
    const alpha = 1 - (spark.life / spark.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = spark.color;
    ctx.shadowBlur = 10;
    ctx.shadowColor = spark.color;
    
    ctx.beginPath();
    ctx.arc(spark.x, spark.y, spark.size, 0, Math.PI * 2);
    ctx.fill();
    
    // Добавляем хвост
    ctx.globalAlpha = alpha * 0.5;
    ctx.beginPath();
    ctx.arc(spark.x - spark.vx, spark.y - spark.vy, spark.size * 0.5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  };

  const animate = (currentTime: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    if (startTimeRef.current === 0) {
      startTimeRef.current = currentTime;
    }

    const elapsed = currentTime - startTimeRef.current;
    
    // Очистка canvas с эффектом затухания
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Создание новых взрывов
    const settings = getIntensitySettings();
    if (elapsed < duration && Math.random() < 0.02) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * (canvas.height * 0.6) + canvas.height * 0.2;
      explosionsRef.current.push(createExplosion(x, y));
    }

    // Обновление и отрисовка взрывов
    updateExplosions();
    explosionsRef.current.forEach(explosion => {
      explosion.sparks.forEach(spark => {
        drawSpark(ctx, spark);
      });
    });

    // Проверка завершения
    if (elapsed < duration || explosionsRef.current.length > 0) {
      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      setIsActive(false);
      onComplete?.();
    }
  };

  useEffect(() => {
    if (active && !isActive) {
      setIsActive(true);
      startTimeRef.current = 0;
      explosionsRef.current = [];
      
      // Создаем начальный взрыв
      const canvas = canvasRef.current;
      if (canvas) {
        const x = canvas.width / 2;
        const y = canvas.height / 2;
        explosionsRef.current.push(createExplosion(x, y));
      }
      
      animationFrameRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [active]);

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
      className="fixed inset-0 pointer-events-none z-40"
      style={{
        width: '100%',
        height: '100%',
        background: 'transparent'
      }}
    />
  );
};

export default Fireworks;