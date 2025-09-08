'use client';

import { useEffect, useRef, useState } from 'react';

interface PerformanceMetrics {
  renderCount: number;
  averageRenderTime: number;
  lastRenderTime: number;
  slowRenders: number; // renders > 16ms
}

export function usePerformance(componentName?: string): PerformanceMetrics {
  const renderCountRef = useRef(0);
  const renderTimesRef = useRef<number[]>([]);
  const startTimeRef = useRef<number>();
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderCount: 0,
    averageRenderTime: 0,
    lastRenderTime: 0,
    slowRenders: 0,
  });

  // Mark render start
  useEffect(() => {
    startTimeRef.current = performance.now();
  });

  // Mark render end and calculate metrics
  useEffect(() => {
    if (startTimeRef.current) {
      const renderTime = performance.now() - startTimeRef.current;
      renderCountRef.current += 1;
      renderTimesRef.current.push(renderTime);

      // Keep only last 100 renders for rolling average
      if (renderTimesRef.current.length > 100) {
        renderTimesRef.current.shift();
      }

      const averageRenderTime = renderTimesRef.current.reduce((a, b) => a + b, 0) / renderTimesRef.current.length;
      const slowRenders = renderTimesRef.current.filter(time => time > 16).length;

      setMetrics({
        renderCount: renderCountRef.current,
        averageRenderTime: Math.round(averageRenderTime * 100) / 100,
        lastRenderTime: Math.round(renderTime * 100) / 100,
        slowRenders,
      });

      // Log slow renders in development
      if (process.env.NODE_ENV === 'development' && renderTime > 16) {
        console.warn(`Slow render detected in ${componentName || 'component'}: ${renderTime.toFixed(2)}ms`);
      }
    }
  }, [componentName]);

  return metrics;
}

// Helper hook for component-level performance monitoring
export function useComponentPerformance(componentName: string) {
  const metrics = usePerformance(componentName);
  
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && metrics.renderCount > 0) {
      console.debug(`${componentName} performance:`, metrics);
    }
  }, [componentName, metrics]);

  return metrics;
}