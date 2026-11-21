import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { X } from 'lucide-react';
import { DemoLookPiece } from './demoData';

interface LookbookModal3DProps {
  piece: DemoLookPiece | null;
  onClose: () => void;
  onAddToBag: (piece: DemoLookPiece, colorIndex: number) => void;
  onOpenProductPage: (piece: DemoLookPiece) => void;
}

export const LookbookModal3D: React.FC<LookbookModal3DProps> = ({
  piece,
  onClose,
  onAddToBag,
  onOpenProductPage,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [colorIdx, setColorIdx] = useState(0);
  const rotTargetRef = useRef({ x: 0.04, y: 0.25 });
  const dragRef = useRef<{ active: boolean; x: number; y: number }>({
    active: false,
    x: 0,
    y: 0,
  });

  useEffect(() => {
    setColorIdx(0);
    rotTargetRef.current = { x: 0.04, y: 0.25 };
  }, [piece]);

  useEffect(() => {
    if (!piece || !canvasRef.current) return;
    const canvas = canvasRef.current;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
    camera.position.set(0, 0.05, 5.2);

    const resize = () => {
      const w = canvas.clientWidth || 480;
      const h = canvas.clientHeight || 520;
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener('resize', resize);

    // Studio Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 1.15));
    const keyLight = new THREE.DirectionalLight(0xfff4e2, 1.45);
    keyLight.position.set(3, 5, 5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xcdd8e8, 0.9);
    rimLight.position.set(-4, -2, -3);
    scene.add(rimLight);

    // 3D Sculpted Frame Slab (front lookbook artwork + brushed titanium bevel + back engraving plate)
    const group = new THREE.Group();
    scene.add(group);

    const activeImage = piece.colors[colorIdx]?.image || piece.image;
    const texLoader = new THREE.TextureLoader();
    const artTex = texLoader.load(activeImage);
    artTex.colorSpace = THREE.SRGBColorSpace;

    const frontMat = new THREE.MeshStandardMaterial({
      map: artTex,
      roughness: 0.32,
      metalness: 0.04,
    });
    const edgeMat = new THREE.MeshStandardMaterial({
      color: 0x1d1d20,
      roughness: 0.28,
      metalness: 0.75,
    });
    const backMat = new THREE.MeshStandardMaterial({
      color: 0x0e0e10,
      roughness: 0.45,
      metalness: 0.35,
    });

    const slabGeo = new THREE.BoxGeometry(2.1, 2.8, 0.09);
    const slab = new THREE.Mesh(slabGeo, [
      edgeMat,
      edgeMat,
      edgeMat,
      edgeMat,
      frontMat,
      backMat,
    ]);
    group.add(slab);

    // Subtle dark pedestal shadow disc
    const shadowGeo = new THREE.CircleGeometry(1.35, 36);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.22,
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -1.62;
    scene.add(shadow);

    let raf = 0;
    let time = 0;
    let curRx = 0.04;
    let curRy = 0.25;

    const tick = () => {
      raf = requestAnimationFrame(tick);
      time += 0.016;
      if (!dragRef.current.active) {
        rotTargetRef.current.y += 0.004;
      }
      curRx += (rotTargetRef.current.x - curRx) * 0.1;
      curRy += (rotTargetRef.current.y - curRy) * 0.1;
      group.rotation.set(curRx, curRy, 0);
      group.position.y = Math.sin(time * 1.6) * 0.045;
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      slabGeo.dispose();
      shadowGeo.dispose();
      artTex.dispose();
      frontMat.dispose();
      edgeMat.dispose();
      backMat.dispose();
      shadowMat.dispose();
      renderer.dispose();
    };
  }, [piece, colorIdx]);

  if (!piece) return null;

  const activeColor = piece.colors[colorIdx] ?? piece.colors[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-6 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="relative grid w-full max-w-4xl overflow-hidden rounded-3xl bg-[#111113] text-white shadow-2xl md:grid-cols-[1.15fr_0.85fr]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close 3D viewer"
          className="absolute right-4 top-4 z-20 grid h-10 w-10 cursor-pointer place-items-center rounded-full border border-white/20 bg-black/50 text-white transition-colors hover:bg-white hover:text-black"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Left Interactive Three.js 3D Orbit Canvas */}
        <div
          className="relative flex min-h-[360px] cursor-grab items-center justify-center bg-gradient-to-b from-[#1e1e22] to-[#0b0b0c] active:cursor-grabbing md:min-h-[500px]"
          onPointerDown={(e) => {
            dragRef.current = { active: true, x: e.clientX, y: e.clientY };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!dragRef.current.active) return;
            const dx = e.clientX - dragRef.current.x;
            const dy = e.clientY - dragRef.current.y;
            dragRef.current.x = e.clientX;
            dragRef.current.y = e.clientY;
            rotTargetRef.current.y += dx * 0.01;
            rotTargetRef.current.x = Math.max(
              -0.45,
              Math.min(0.45, rotTargetRef.current.x + dy * 0.008)
            );
          }}
          onPointerUp={() => {
            dragRef.current.active = false;
          }}
          onPointerCancel={() => {
            dragRef.current.active = false;
          }}
        >
          <canvas ref={canvasRef} className="h-full w-full block" />
          <span className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/15 bg-black/55 px-4 py-1 text-[10px] tracking-[0.25em] text-white/65 uppercase">
            Drag to rotate 3D look
          </span>
        </div>

        {/* Right Editorial Details & Live Bag Integration */}
        <div className="flex flex-col justify-between bg-[#f7f7f5] p-7 text-[#0b0b0b] sm:p-9">
          <div>
            <span className="font-ui-demo text-[11px] tracking-[0.28em] text-black/50 uppercase">
              SPARTA 3D Archive · {piece.category}
            </span>
            <h3 className="font-display-demo mt-2 text-2xl tracking-[0.02em] uppercase sm:text-3xl">
              {piece.name}
            </h3>
            <p className="mt-2 text-xl font-bold italic">
              ৳{piece.price.toLocaleString('en-IN')}
            </p>

            <dl className="mt-6 space-y-2.5 border-y border-black/10 py-4 text-[13px]">
              <div className="flex justify-between gap-4">
                <dt className="text-black/55">Fabric / Notes</dt>
                <dd className="font-medium italic">{piece.fabric}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-black/55">Fit / Format</dt>
                <dd className="font-medium italic">{piece.fit}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-black/55">Rating</dt>
                <dd className="font-medium italic">★ {piece.rating.toFixed(1)} / 5.0</dd>
              </div>
            </dl>

            <div className="mt-5">
              <p className="text-[11px] tracking-[0.2em] text-black/55 uppercase">
                Colorway: <span className="font-medium text-black">{activeColor.name}</span>
              </p>
              <div className="mt-2.5 flex gap-2.5">
                {piece.colors.map((c, i) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setColorIdx(i)}
                    aria-label={c.name}
                    className={`grid h-7 w-7 cursor-pointer place-items-center rounded-full border ${
                      i === colorIdx ? 'border-black' : 'border-transparent hover:border-black/30'
                    }`}
                  >
                    <span
                      className="h-4.5 w-4.5 rounded-full ring-1 ring-inset ring-black/15"
                      style={{ background: c.hex }}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => {
                onAddToBag(piece, colorIdx);
                onClose();
              }}
              className="font-ui-demo w-full cursor-pointer rounded-full bg-[#0b0b0b] py-3.5 text-[14px] font-light text-white transition-transform hover:-translate-y-0.5"
            >
              Add to Shopping Bag
            </button>
            <button
              type="button"
              onClick={() => onOpenProductPage(piece)}
              className="font-ui-demo w-full cursor-pointer rounded-full border border-black/25 py-3 text-[13px] font-light text-black transition-colors hover:border-black"
            >
              View Full Product Page & Sizes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
