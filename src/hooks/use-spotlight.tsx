"use client";

import { useEffect, useState, useCallback } from "react";

interface SpotlightPosition {
  x: number;
  y: number;
}

interface UseSpotlightOptions {
  /** Throttle mouse events (ms) */
  throttle?: number;
  /** Smooth the movement (0-1) */
  smoothing?: number;
}

export function useSpotlight(options: UseSpotlightOptions = {}) {
  const { throttle = 16, smoothing = 0.15 } = options;
  const [position, setPosition] = useState<SpotlightPosition>({ x: 50, y: 50 });
  const [targetPosition, setTargetPosition] = useState<SpotlightPosition>({ x: 50, y: 50 });
  const [isHovering, setIsHovering] = useState(false);

  // Handle mouse move
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const x = (e.clientX / window.innerWidth) * 100;
    const y = (e.clientY / window.innerHeight) * 100;
    setTargetPosition({ x, y });
  }, []);

  // Smooth animation loop
  useEffect(() => {
    let animationFrame: number;
    let lastUpdate = 0;

    const animate = (timestamp: number) => {
      if (timestamp - lastUpdate >= throttle) {
        setPosition(prev => ({
          x: prev.x + (targetPosition.x - prev.x) * smoothing,
          y: prev.y + (targetPosition.y - prev.y) * smoothing,
        }));
        lastUpdate = timestamp;
      }
      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [targetPosition, throttle, smoothing]);

  // Add mouse listeners
  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    
    const handleMouseEnter = () => setIsHovering(true);
    const handleMouseLeave = () => setIsHovering(false);
    
    document.addEventListener("mouseenter", handleMouseEnter);
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseenter", handleMouseEnter);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [handleMouseMove]);

  return {
    position,
    isHovering,
    // CSS variables for inline styles
    cssVars: {
      "--spotlight-x": `${position.x}%`,
      "--spotlight-y": `${position.y}%`,
    } as React.CSSProperties,
    // Pixel position for absolute positioning
    pixelPosition: {
      x: (position.x / 100) * (typeof window !== "undefined" ? window.innerWidth : 0),
      y: (position.y / 100) * (typeof window !== "undefined" ? window.innerHeight : 0),
    },
  };
}

// Spotlight overlay component
export function SpotlightOverlay({ 
  className,
  color = "rgba(99, 102, 241, 0.08)",
  size = "40em",
  blur = "8em",
}: {
  className?: string;
  color?: string;
  size?: string;
  blur?: string;
}): JSX.Element {
  const { position } = useSpotlight({ smoothing: 0.1 });

  return (
    <div
      className={className}
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
        background: `radial-gradient(
          circle at ${position.x}% ${position.y}%,
          ${color} 0%,
          transparent ${size}
        )`,
        filter: `blur(${blur})`,
      }}
      aria-hidden="true"
    />
  );
}
