import { useState, useCallback } from "react";
import { createPortal } from "react-dom";
import Cropper from "react-easy-crop";
import { Check, Plus, Minus, RotateCcw, RefreshCw } from "lucide-react";

async function getCroppedImg(imageSrc, pixelCrop, rotation = 0) {
  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", reject);
    img.src = imageSrc;
  });

  const size = 400;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingQuality = "high";

  if (rotation) {
    // Render rotated source to an offscreen canvas first
    const rad = (rotation * Math.PI) / 180;
    const safe = Math.max(image.width, image.height) * 2;
    const off = document.createElement("canvas");
    off.width = safe;
    off.height = safe;
    const offCtx = off.getContext("2d");
    offCtx.translate(safe / 2, safe / 2);
    offCtx.rotate(rad);
    offCtx.drawImage(image, -image.width / 2, -image.height / 2);
    const dx = safe / 2 - image.width / 2;
    const dy = safe / 2 - image.height / 2;
    ctx.drawImage(
      off,
      pixelCrop.x + dx, pixelCrop.y + dy,
      pixelCrop.width, pixelCrop.height,
      0, 0, size, size
    );
  } else {
    ctx.drawImage(
      image,
      pixelCrop.x, pixelCrop.y,
      pixelCrop.width, pixelCrop.height,
      0, 0, size, size
    );
  }
  return canvas.toDataURL("image/jpeg", 0.92);
}

export default function ImageCropModal({ imageSrc, onConfirm, onCancel }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropComplete = useCallback((_, pixels) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    setIsProcessing(true);
    try {
      const dataUrl = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
      onConfirm(dataUrl);
    } finally {
      setIsProcessing(false);
    }
  };

  const nudgeZoom = (delta) =>
    setZoom((z) => Math.min(3, Math.max(1, Number((z + delta).toFixed(2)))));

  const reset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
  };

  if (!imageSrc) return null;

  return createPortal(
    <div className="image-crop-overlay">
      <div className="image-crop-panel">
        {/* ── Header ── */}
        <div className="image-crop-header">
          <button onClick={reset} className="image-crop-text-btn no-spring" aria-label="Reset">
            <RefreshCw className="w-3.5 h-3.5" />
            Reset
          </button>
          <div className="text-center">
            <p className="text-[14px] font-bold tracking-tight leading-none" style={{ color: "var(--text-primary)" }}>Move &amp; Scale</p>
            <p className="text-[11px] mt-1 leading-none" style={{ color: "var(--text-muted)" }}>
              Drag freely · pinch to zoom
            </p>
          </div>
          <button
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="image-crop-text-btn no-spring"
            aria-label="Rotate"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Rotate
          </button>
        </div>

        {/* ── Crop canvas ── */}
        <div className="relative flex-1 image-crop-stage">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={1}
            cropShape="rect"
            showGrid
            minZoom={1}
            maxZoom={3}
            zoomSpeed={0.25}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onCropComplete}
            style={{
              containerStyle: { background: "transparent" },
              cropAreaStyle: {
                border: "2.5px solid rgba(34,197,94,0.9)",
                borderRadius: "10px",
                boxShadow: "0 0 0 9999px rgba(240,253,244,0.62), 0 0 22px rgba(34,197,94,0.22)",
                color: "rgba(240,253,244,0.62)",
              },
            }}
          />
        </div>

        {/* ── Footer: zoom + actions ── */}
        <div className="image-crop-footer">
          {/* Zoom row */}
          <div className="flex items-center gap-2.5 mb-3.5">
            <button onClick={() => nudgeZoom(-0.2)} className="image-crop-zoom-btn no-spring" aria-label="Zoom out">
              <Minus className="w-3.5 h-3.5" />
            </button>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="image-crop-slider flex-1"
              style={{ "--fill": `${((zoom - 1) / 2) * 100}%` }}
            />
            <button onClick={() => nudgeZoom(0.2)} className="image-crop-zoom-btn no-spring" aria-label="Zoom in">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-2.5">
            <button
              onClick={onCancel}
              className="image-crop-action no-spring"
              style={{
                background: "var(--lg-tint)",
                border: "1px solid var(--lg-border)",
                boxShadow: "inset 0 1px 0 var(--lg-hl-top)",
                color: "var(--text-secondary)",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isProcessing || !croppedAreaPixels}
              className="image-crop-action flex items-center justify-center gap-1.5 disabled:opacity-40 no-spring"
              style={{
                background: "linear-gradient(180deg, rgba(34,197,94,0.22), rgba(34,197,94,0.1))",
                border: "1px solid var(--green-border)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4), 0 4px 14px rgba(34,197,94,0.2)",
                color: "var(--green-primary)",
              }}
            >
              {isProcessing ? (
                <div className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              {isProcessing ? "Saving…" : "Done"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
