import { useEffect, useMemo, useState } from 'react';
import Cropper, { type Area, type Point } from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';

import type { ImageDraft } from '../../hooks/useRecipeForm';

type ImageCropDialogProps = {
  image: ImageDraft;
  onApply: (cropArea: Area) => Promise<void>;
  onClose: () => void;
};

export function ImageCropDialog({ image, onApply, onClose }: ImageCropDialogProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [cropArea, setCropArea] = useState<Area>();
  const [isApplying, setIsApplying] = useState(false);
  const sourceUrl = useMemo(
    () => (image.sourceFile ? URL.createObjectURL(image.sourceFile) : ''),
    [image.sourceFile],
  );

  useEffect(() => {
    if (!sourceUrl) {
      return;
    }

    return () => {
      URL.revokeObjectURL(sourceUrl);
    };
  }, [sourceUrl]);

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-cocoa-900/45 p-3 backdrop-blur-sm sm:items-center sm:justify-center">
      <div className="w-full max-w-screen-sm overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="border-b border-petal-100 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-petal-600">Crop image</p>
          <h3 className="mt-1 text-lg font-bold text-cocoa-900">{image.alt}</h3>
        </div>

        <div className="relative h-[52dvh] min-h-80 bg-cocoa-900">
          {sourceUrl ? (
            <Cropper
              image={sourceUrl}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="rect"
              showGrid={false}
              onCropChange={setCrop}
              onCropComplete={(_, croppedAreaPixels) => setCropArea(croppedAreaPixels)}
              onZoomChange={setZoom}
            />
          ) : null}
        </div>

        <div className="space-y-4 p-4">
          <label className="block">
            <span className="text-sm font-bold text-cocoa-700">Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              className="mt-2 w-full accent-petal-500"
              onChange={(event) => setZoom(Number(event.target.value))}
            />
          </label>

          <div className="grid grid-cols-[1fr_auto] gap-3">
            <button
              type="button"
              className="min-h-12 rounded-lg bg-petal-500 px-4 text-sm font-bold text-white shadow-lg shadow-petal-300/40 transition hover:bg-petal-600 disabled:opacity-60"
              disabled={!cropArea || isApplying}
              onClick={async () => {
                if (!cropArea) {
                  return;
                }

                setIsApplying(true);
                await onApply(cropArea);
                setIsApplying(false);
                onClose();
              }}
            >
              {isApplying ? 'Cropping' : 'Apply crop'}
            </button>
            <button
              type="button"
              className="min-h-12 rounded-lg border border-petal-100 bg-white px-4 text-sm font-bold text-petal-700 shadow-soft transition hover:bg-petal-50"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
