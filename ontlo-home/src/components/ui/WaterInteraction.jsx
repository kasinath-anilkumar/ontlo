import React, { useEffect, useRef } from "react";

const WaterInteraction = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const particles = [];

    class Particle {
      constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 120 + 40;
        this.alpha = 0.12;
        this.life = 1;
      }

      update() {
        this.life *= 0.96;
        this.size *= 0.985;
        this.alpha *= 0.96;
      }

      draw() {
        const gradient = ctx.createRadialGradient(
          this.x,
          this.y,
          0,
          this.x,
          this.y,
          this.size
        );

        gradient.addColorStop(0, `rgba(168,85,247,${this.alpha})`);
        gradient.addColorStop(0.4, `rgba(236,72,153,${this.alpha * 0.5})`);
        gradient.addColorStop(1, `rgba(0,0,0,0)`);

        ctx.beginPath();
        ctx.fillStyle = gradient;
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const addParticle = (x, y) => {
      particles.push(new Particle(x, y));
    };

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw();

        if (particles[i].life < 0.05) {
          particles.splice(i, 1);
        }
      }

      requestAnimationFrame(animate);
    };

    animate();

    const handleMove = (e) => {
      addParticle(e.clientX, e.clientY);
    };

    window.addEventListener("mousemove", handleMove);

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-10"
    />
  );
};

export default WaterInteraction;