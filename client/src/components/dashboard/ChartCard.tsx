import React, { useEffect, useRef, useState } from 'react';
import { CHART_DATA_POINTS } from '@/lib/constants';

const ChartCard: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [backgroundGradientPosition, setBackgroundGradientPosition] = useState(0);

  // Function to animate the background gradient
  useEffect(() => {
    const animateBackgroundGradient = () => {
      setBackgroundGradientPosition((prev) => (prev + 0.5) % 200);
    };

    const intervalId = setInterval(animateBackgroundGradient, 50);
    return () => clearInterval(intervalId);
  }, []);

  // Chart drawing and animation
  useEffect(() => {
    let startTime: number | null = null;
    const animationDuration = 1500; // ms
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);
      
      setAnimationProgress(progress);
      drawChart(progress);
      
      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  const drawChart = (progress: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    // Set canvas size to match display size
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw animated background gradient
    const bgGradient = ctx.createLinearGradient(
      width * 0.5, 
      height * (1 - backgroundGradientPosition / 200),
      width * 0.5, 
      height * (1 - (backgroundGradientPosition + 100) / 200)
    );
    bgGradient.addColorStop(0, 'rgba(162, 89, 255, 0.03)');
    bgGradient.addColorStop(0.5, 'rgba(179, 104, 247, 0.05)');
    bgGradient.addColorStop(1, 'rgba(162, 89, 255, 0.03)');
    
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Draw background grid
    ctx.strokeStyle = '#3A3A43';
    ctx.lineWidth = 0.5;

    // Horizontal grid lines
    for (let i = 0; i < height; i += 30) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }

    // Scale the data points to fit the canvas
    const maxDataPoint = Math.max(...CHART_DATA_POINTS);
    const scaleFactor = (height - 10) / maxDataPoint;
    
    // Calculate how many points to draw based on animation progress
    const pointsToDraw = Math.ceil(CHART_DATA_POINTS.length * progress);
    
    if (pointsToDraw > 1) {
      // Draw the chart line with animation
      ctx.beginPath();
      ctx.moveTo(0, height - CHART_DATA_POINTS[0] * scaleFactor);

      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#A259FF');
      gradient.addColorStop(1, '#B368F7');

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;

      // Draw line chart up to the current animation point
      for (let i = 0; i < pointsToDraw; i++) {
        const x = (i / (CHART_DATA_POINTS.length - 1)) * width;
        const y = height - CHART_DATA_POINTS[i] * scaleFactor;
        ctx.lineTo(x, y);
      }

      ctx.stroke();

      // Add subtle gradient fill below the line
      if (pointsToDraw > 1) {
        const lastX = ((pointsToDraw - 1) / (CHART_DATA_POINTS.length - 1)) * width;
        ctx.lineTo(lastX, height);
        ctx.lineTo(0, height);
        ctx.closePath();

        const fillGradient = ctx.createLinearGradient(0, 0, 0, height);
        fillGradient.addColorStop(0, 'rgba(162, 89, 255, 0.2)');
        fillGradient.addColorStop(1, 'rgba(162, 89, 255, 0)');
        ctx.fillStyle = fillGradient;
        ctx.fill();
      }
    }
    
    // Draw data points with animation
    for (let i = 0; i < pointsToDraw; i++) {
      const x = (i / (CHART_DATA_POINTS.length - 1)) * width;
      const y = height - CHART_DATA_POINTS[i] * scaleFactor;
      
      // Calculate delay for each point to appear with a ripple effect
      const pointDelay = i / CHART_DATA_POINTS.length;
      const pointProgress = Math.max(0, Math.min(1, (progress - pointDelay) * 3));
      
      if (pointProgress > 0) {
        // Draw dot with scale animation
        const dotSize = 4 * pointProgress;
        ctx.beginPath();
        ctx.arc(x, y, dotSize, 0, Math.PI * 2);
        ctx.fillStyle = '#A259FF';
        ctx.fill();
        
        // Add glow effect that fades with the animation
        if (pointProgress < 1) {
          const glowSize = 8 * (1 - pointProgress);
          ctx.beginPath();
          ctx.arc(x, y, glowSize, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(162, 89, 255, ${0.3 * (1 - pointProgress)})`;
          ctx.fill();
        }
      }
    }
  };

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      drawChart(animationProgress);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [animationProgress]);

  return (
    <div className="bg-card rounded-xl p-4 mb-5 shadow-lg overflow-hidden">
      <h2 className="text-md font-medium mb-3">UNI, накопленные за день</h2>
      <div className="relative h-[120px]">
        <canvas ref={canvasRef} className="w-full h-full"></canvas>
      </div>
    </div>
  );
};

export default ChartCard;
