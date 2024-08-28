"use client";

import React, { useEffect, useRef } from 'react';
import { Application } from '@splinetool/runtime';

const SplineScene = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      const app = new Application(canvasRef.current);
      app.load('https://prod.spline.design/Ue8adsd7wBG3TVUC/scene.splinecode')
        .then(() => {
          console.log('Spline scene loaded');
        })
        .catch(console.error);
    }
  }, []);

  return (
    <div className="fixed inset-0 z-[-1]">
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default SplineScene;