import React, { useEffect, useRef } from 'react';

const QuantumAnimation: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;

    const particles: Particle[] = [];
    const particleCount = 60;
    const connectionDistance = 150;
    const mouse = { x: 0, y: 0, active: false };

    class Particle {
      x: number;
      y: number;
      z: number;
      vx: number;
      vy: number;
      vz: number;
      originalX: number;
      originalY: number;
      originalZ: number;

      constructor() {
        // Distribute in a sphere
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos((Math.random() * 2) - 1);
        const radius = 250;

        this.x = radius * Math.sin(phi) * Math.cos(theta);
        this.y = radius * Math.sin(phi) * Math.sin(theta);
        this.z = radius * Math.cos(phi);

        this.originalX = this.x;
        this.originalY = this.y;
        this.originalZ = this.z;

        this.vx = (Math.random() - 0.5) * 0.2;
        this.vy = (Math.random() - 0.5) * 0.2;
        this.vz = (Math.random() - 0.5) * 0.2;
      }

      update(rotation: { x: number, y: number }) {
        // Apply rotation
        const sinX = Math.sin(rotation.x);
        const cosX = Math.cos(rotation.x);
        const sinY = Math.sin(rotation.y);
        const cosY = Math.cos(rotation.y);

        // Rotate Y
        let x1 = this.x * cosY - this.z * sinY;
        let z1 = this.x * sinY + this.z * cosY;

        // Rotate X
        let y1 = this.y * cosX - z1 * sinX;
        let z2 = this.y * sinX + z1 * cosX;

        this.x = x1;
        this.y = y1;
        this.z = z2;

        // Subtle floating motion
        this.x += this.vx;
        this.y += this.vy;
        this.z += this.vz;

        // Return to sphere constraints (simplified)
        const d = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
        if (d > 260 || d < 240) {
          this.vx *= -1;
          this.vy *= -1;
          this.vz *= -1;
        }
      }
    }

    const init = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      particles.length = 0;
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
      }
    };

    let rotationX = 0.001;
    let rotationY = 0.002;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Parallax based on mouse
      const targetRotX = mouse.active ? (mouse.y - height / 2) * 0.00005 : 0.001;
      const targetRotY = mouse.active ? (mouse.x - width / 2) * 0.00005 : 0.002;
      
      rotationX += (targetRotX - rotationX) * 0.05;
      rotationY += (targetRotY - rotationY) * 0.05;

      const centerX = width / 2;
      const centerY = height / 2;

      // Draw Core Glow
      const coreGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 300);
      coreGradient.addColorStop(0, 'rgba(6, 182, 212, 0.05)');
      coreGradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.02)');
      coreGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = coreGradient;
      ctx.fillRect(0, 0, width, height);

      // Sort by Z for proper layering
      particles.sort((a, b) => b.z - a.z);

      ctx.lineWidth = 0.5;

      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        p1.update({ x: rotationX, y: rotationY });

        // Projection
        const scale = 800 / (800 + p1.z);
        const screenX = centerX + p1.x * scale;
        const screenY = centerY + p1.y * scale;

        // Draw connections
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dz = p1.z - p2.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < connectionDistance) {
            const scale2 = 800 / (800 + p2.z);
            const screenX2 = centerX + p2.x * scale2;
            const screenY2 = centerY + p2.y * scale2;

            const alpha = (1 - dist / connectionDistance) * (scale * 0.5);
            ctx.strokeStyle = `rgba(34, 211, 238, ${alpha})`;
            
            // Pulse effect occasionally
            if (Math.sin(Date.now() * 0.002 + i) > 0.95) {
                ctx.strokeStyle = `rgba(139, 92, 246, ${alpha * 2})`;
                ctx.lineWidth = 1;
            } else {
                ctx.lineWidth = 0.5;
            }

            ctx.beginPath();
            ctx.moveTo(screenX, screenY);
            ctx.lineTo(screenX2, screenY2);
            ctx.stroke();
          }
        }

        // Draw Node
        const size = 1.5 * scale;
        const alpha = 0.2 + (p1.z + 250) / 500;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
        ctx.beginPath();
        ctx.arc(screenX, screenY, size, 0, Math.PI * 2);
        ctx.fill();
        
        if (alpha > 0.8) {
           ctx.shadowBlur = 10;
           ctx.shadowColor = '#22d3ee';
           ctx.fill();
           ctx.shadowBlur = 0;
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    const handleResize = () => {
      init();
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    init();
    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none opacity-40 mix-blend-screen"
      style={{ zIndex: 0 }}
    />
  );
};

export default QuantumAnimation;
