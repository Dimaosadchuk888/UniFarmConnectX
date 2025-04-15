import React, { useEffect, useRef } from 'react';
import { CHART_DATA_POINTS } from '@/lib/constants';

const ChartCard: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const drawChart = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      // Set canvas size to match display size
      canvas.width = width;
      canvas.height = height;

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
      
      // Draw the chart line
      ctx.beginPath();
      ctx.moveTo(0, height - CHART_DATA_POINTS[0] * scaleFactor);

      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#A259FF');
      gradient.addColorStop(1, '#B368F7');

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;

      // Draw line chart
      for (let i = 0; i < CHART_DATA_POINTS.length; i++) {
        const x = (i / (CHART_DATA_POINTS.length - 1)) * width;
        const y = height - CHART_DATA_POINTS[i] * scaleFactor;
        ctx.lineTo(x, y);
      }

      ctx.stroke();

      // Add subtle gradient fill below the line
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();

      const fillGradient = ctx.createLinearGradient(0, 0, 0, height);
      fillGradient.addColorStop(0, 'rgba(162, 89, 255, 0.2)');
      fillGradient.addColorStop(1, 'rgba(162, 89, 255, 0)');
      ctx.fillStyle = fillGradient;
      ctx.fill();
    };

    drawChart();

    // Redraw chart on window resize
    window.addEventListener('resize', drawChart);
    return () => {
      window.removeEventListener('resize', drawChart);
    };
  }, []);

  return (
    <div className="bg-card rounded-xl p-4 mb-5 shadow-lg">
      <h2 className="text-md font-medium mb-3">UNI, накопленные за день</h2>
      <div className="relative h-[120px]">
        <canvas ref={canvasRef} className="w-full h-full"></canvas>
      </div>
    </div>
  );
};

export default ChartCard;
