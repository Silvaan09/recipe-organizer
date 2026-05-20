import { RotateCcw, RotateCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import type { ImageDraft } from '../../hooks/useRecipeForm';
import type { ImageCropArea } from '../../services/image';

type ImageCropMode = 'display' | 'recipe';

type ImageCropDialogProps = {
  cropMode?: ImageCropMode;
  image: ImageDraft;
  onApply: (cropArea: ImageCropArea) => Promise<void>;
  onClose: () => void;
};

type CropRect = {
  height: number;
  width: number;
  x: number;
  y: number;
};

type ImageSize = {
  height: number;
  width: number;
};

type DragHandle =
  | 'bottom'
  | 'bottom-left'
  | 'bottom-right'
  | 'left'
  | 'move'
  | 'right'
  | 'top'
  | 'top-left'
  | 'top-right';

const MIN_CROP_PERCENT = 8;

function normalizeRotation(rotation: number) {
  return ((rotation % 360) + 360) % 360;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getRotatedSize(width: number, height: number, rotation: number) {
  const isSideways = normalizeRotation(rotation) === 90 || normalizeRotation(rotation) === 270;

  return {
    height: isSideways ? width : height,
    width: isSideways ? height : width,
  };
}

function loadImageSize(sourceUrl: string): Promise<ImageSize> {
  return new Promise((resolve, reject) => {
    const imageElement = new Image();

    imageElement.onload = () => {
      resolve({
        height: imageElement.naturalHeight,
        width: imageElement.naturalWidth,
      });
    };
    imageElement.onerror = () => reject(new Error('Bild konnte nicht geladen werden.'));
    imageElement.src = sourceUrl;
  });
}

function createRotatedPreviewUrl(sourceUrl: string, rotation: number): Promise<string> {
  const normalizedRotation = normalizeRotation(rotation);

  if (normalizedRotation === 0) {
    return Promise.resolve(sourceUrl);
  }

  return new Promise((resolve, reject) => {
    const imageElement = new Image();

    imageElement.onload = () => {
      const rotatedSize = getRotatedSize(
        imageElement.naturalWidth,
        imageElement.naturalHeight,
        normalizedRotation,
      );
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { alpha: false });

      if (!context) {
        reject(new Error('Bilddrehung wird in diesem Browser nicht unterstützt.'));
        return;
      }

      canvas.width = rotatedSize.width;
      canvas.height = rotatedSize.height;
      context.fillStyle = '#fff7f8';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.translate(canvas.width / 2, canvas.height / 2);
      context.rotate((normalizedRotation * Math.PI) / 180);
      context.drawImage(
        imageElement,
        -imageElement.naturalWidth / 2,
        -imageElement.naturalHeight / 2,
      );
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Bildvorschau konnte nicht gedreht werden.'));
          return;
        }

        resolve(URL.createObjectURL(blob));
      }, 'image/jpeg');
    };
    imageElement.onerror = () => reject(new Error('Bild konnte nicht geladen werden.'));
    imageElement.src = sourceUrl;
  });
}

function rotateCropArea(cropArea: ImageCropArea | undefined, rotation: number): ImageCropArea | undefined {
  if (!cropArea) {
    return undefined;
  }

  return {
    ...cropArea,
    rotation,
  };
}

export function ImageCropDialog({
  cropMode = 'recipe',
  image,
  onApply,
  onClose,
}: ImageCropDialogProps) {
  const [rotation, setRotation] = useState(0);
  const [imageSize, setImageSize] = useState<ImageSize>();
  const [manualCropArea, setManualCropArea] = useState<ImageCropArea>();
  const [previewUrl, setPreviewUrl] = useState(image.previewUrl);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const rotatedSize = imageSize
    ? getRotatedSize(imageSize.width, imageSize.height, rotation)
    : undefined;
  const activeCropArea =
    cropMode === 'display' ? manualCropArea : rotateCropArea(manualCropArea, rotation);

  useEffect(() => {
    let isMounted = true;
    let objectUrlToRevoke = '';

    async function preparePreview() {
      if (!image.previewUrl) {
        return;
      }

      try {
        const nextPreviewUrl = await createRotatedPreviewUrl(image.previewUrl, rotation);

        if (!isMounted) {
          if (nextPreviewUrl !== image.previewUrl) {
            URL.revokeObjectURL(nextPreviewUrl);
          }
          return;
        }

        if (nextPreviewUrl !== image.previewUrl) {
          objectUrlToRevoke = nextPreviewUrl;
        }

        const nextImageSize = await loadImageSize(nextPreviewUrl);

        if (isMounted) {
          setPreviewUrl(nextPreviewUrl);
          setImageSize(nextImageSize);
          setManualCropArea(undefined);
          setPreviewError(null);
        }
      } catch {
        if (isMounted) {
          setPreviewError('Bildvorschau konnte nicht geladen werden.');
        }
      }
    }

    void preparePreview();

    return () => {
      isMounted = false;

      if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke);
      }
    };
  }, [image.previewUrl, rotation]);

  function rotateImage(direction: 'left' | 'right') {
    setRotation((currentRotation) =>
      normalizeRotation(currentRotation + (direction === 'left' ? -90 : 90)),
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-cocoa-900/45 p-3 backdrop-blur-sm sm:items-center sm:justify-center">
      <div className="max-h-[calc(100dvh-1.5rem)] w-full max-w-screen-sm overflow-y-auto rounded-lg bg-white shadow-2xl">
        <div className="border-b border-petal-100 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-petal-600">
            {cropMode === 'display' ? 'Anzeigebild zuschneiden' : 'Rezeptbild zuschneiden'}
          </p>
          <h3 className="mt-1 text-lg font-bold text-cocoa-900">{image.alt}</h3>
        </div>

        <div className="relative h-[min(58dvh,32rem)] min-h-72 overflow-hidden bg-cocoa-900">
          {previewError ? (
            <div className="grid size-full place-items-center p-6 text-center text-sm font-bold text-white">
              {previewError}
            </div>
          ) : previewUrl && rotatedSize ? (
            <EdgeCropEditor
              imageSize={rotatedSize}
              imageUrl={previewUrl}
              onCropAreaChange={setManualCropArea}
            />
          ) : null}
        </div>

        <div className="space-y-4 p-4">
          {cropMode === 'recipe' ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-petal-100 bg-white px-3 text-sm font-bold text-petal-700 shadow-soft transition hover:bg-petal-50"
                onClick={() => rotateImage('left')}
              >
                <RotateCcw aria-hidden="true" size={18} />
                Nach links drehen
              </button>
              <button
                type="button"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-petal-100 bg-white px-3 text-sm font-bold text-petal-700 shadow-soft transition hover:bg-petal-50"
                onClick={() => rotateImage('right')}
              >
                <RotateCw aria-hidden="true" size={18} />
                Nach rechts drehen
              </button>
            </div>
          ) : null}

          <div className="grid grid-cols-[1fr_auto] gap-3">
            <button
              type="button"
              className="min-h-12 rounded-lg bg-petal-500 px-4 text-sm font-bold text-white shadow-lg shadow-petal-300/40 transition hover:bg-petal-600 disabled:opacity-60"
              disabled={!activeCropArea || isApplying}
              onClick={async () => {
                if (!activeCropArea) {
                  return;
                }

                setIsApplying(true);
                await onApply(activeCropArea);
                setIsApplying(false);
                onClose();
              }}
            >
              {isApplying ? 'Zuschneiden' : 'Zuschnitt anwenden'}
            </button>
            <button
              type="button"
              className="min-h-12 rounded-lg border border-petal-100 bg-white px-4 text-sm font-bold text-petal-700 shadow-soft transition hover:bg-petal-50"
              onClick={onClose}
            >
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type EdgeCropEditorProps = {
  imageSize: ImageSize;
  imageUrl: string;
  onCropAreaChange: (cropArea: ImageCropArea) => void;
};

function EdgeCropEditor({ imageSize, imageUrl, onCropAreaChange }: EdgeCropEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [imageBounds, setImageBounds] = useState<CropRect>();
  const [cropRect, setCropRect] = useState<CropRect>({
    height: 90,
    width: 90,
    x: 5,
    y: 5,
  });
  const [dragging, setDragging] = useState<{
    handle: DragHandle;
    startPoint: { x: number; y: number };
    startRect: CropRect;
  }>();

  useEffect(() => {
    function measureImage() {
      const container = containerRef.current;

      if (!container) {
        return;
      }

      const containerBox = container.getBoundingClientRect();
      const availableWidth = Math.max(1, containerBox.width - 32);
      const availableHeight = Math.max(1, containerBox.height - 32);
      const fitScale = Math.min(
        availableWidth / imageSize.width,
        availableHeight / imageSize.height,
      );
      const renderedWidth = imageSize.width * fitScale;
      const renderedHeight = imageSize.height * fitScale;

      setImageBounds({
        height: renderedHeight,
        width: renderedWidth,
        x: (containerBox.width - renderedWidth) / 2,
        y: (containerBox.height - renderedHeight) / 2,
      });
    }

    measureImage();
    window.addEventListener('resize', measureImage);

    return () => {
      window.removeEventListener('resize', measureImage);
    };
  }, [imageSize.height, imageSize.width, imageUrl]);

  useEffect(() => {
    onCropAreaChange({
      height: Math.round((cropRect.height / 100) * imageSize.height),
      width: Math.round((cropRect.width / 100) * imageSize.width),
      x: Math.round((cropRect.x / 100) * imageSize.width),
      y: Math.round((cropRect.y / 100) * imageSize.height),
    });
  }, [cropRect, imageSize.height, imageSize.width, onCropAreaChange]);

  useEffect(() => {
    if (!dragging || !imageBounds) {
      return;
    }

    const activeDragging = dragging;
    const activeImageBounds = imageBounds;

    function getPointerPercent(event: PointerEvent) {
      const container = containerRef.current;

      if (!container) {
        return { x: 0, y: 0 };
      }

      const containerBox = container.getBoundingClientRect();
      const localX = event.clientX - containerBox.left - activeImageBounds.x;
      const localY = event.clientY - containerBox.top - activeImageBounds.y;

      return {
        x: clamp((localX / activeImageBounds.width) * 100, 0, 100),
        y: clamp((localY / activeImageBounds.height) * 100, 0, 100),
      };
    }

    function handlePointerMove(event: PointerEvent) {
      event.preventDefault();
      const point = getPointerPercent(event);
      const { handle, startPoint, startRect } = activeDragging;

      if (handle === 'move') {
        const nextX = clamp(startRect.x + point.x - startPoint.x, 0, 100 - startRect.width);
        const nextY = clamp(startRect.y + point.y - startPoint.y, 0, 100 - startRect.height);

        setCropRect({
          ...startRect,
          x: nextX,
          y: nextY,
        });
        return;
      }

      let nextX = startRect.x;
      let nextY = startRect.y;
      let nextWidth = startRect.width;
      let nextHeight = startRect.height;

      if (handle.includes('left')) {
        const rightEdge = startRect.x + startRect.width;
        nextX = clamp(point.x, 0, rightEdge - MIN_CROP_PERCENT);
        nextWidth = rightEdge - nextX;
      }

      if (handle.includes('right')) {
        nextWidth = clamp(point.x - startRect.x, MIN_CROP_PERCENT, 100 - startRect.x);
      }

      if (handle.includes('top')) {
        const bottomEdge = startRect.y + startRect.height;
        nextY = clamp(point.y, 0, bottomEdge - MIN_CROP_PERCENT);
        nextHeight = bottomEdge - nextY;
      }

      if (handle.includes('bottom')) {
        nextHeight = clamp(point.y - startRect.y, MIN_CROP_PERCENT, 100 - startRect.y);
      }

      setCropRect({
        height: nextHeight,
        width: nextWidth,
        x: nextX,
        y: nextY,
      });
    }

    function handlePointerUp() {
      setDragging(undefined);
    }

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragging, imageBounds]);

  function startDrag(handle: DragHandle, event: React.PointerEvent) {
    if (!imageBounds) {
      return;
    }

    const container = containerRef.current;

    if (!container) {
      return;
    }

    const containerBox = container.getBoundingClientRect();

    setDragging({
      handle,
      startPoint: {
        x: clamp(
          ((event.clientX - containerBox.left - imageBounds.x) / imageBounds.width) * 100,
          0,
          100,
        ),
        y: clamp(
          ((event.clientY - containerBox.top - imageBounds.y) / imageBounds.height) * 100,
          0,
          100,
        ),
      },
      startRect: cropRect,
    });
  }

  const cropStyle =
    imageBounds &&
    ({
      height: `${(cropRect.height / 100) * imageBounds.height}px`,
      left: `${imageBounds.x + (cropRect.x / 100) * imageBounds.width}px`,
      top: `${imageBounds.y + (cropRect.y / 100) * imageBounds.height}px`,
      width: `${(cropRect.width / 100) * imageBounds.width}px`,
    } satisfies React.CSSProperties);
  const handles: Array<{ handle: DragHandle; className: string }> = [
    { handle: 'top-left', className: '-left-3 -top-3 cursor-nwse-resize' },
    { handle: 'top', className: 'left-1/2 -top-3 -translate-x-1/2 cursor-ns-resize' },
    { handle: 'top-right', className: '-right-3 -top-3 cursor-nesw-resize' },
    { handle: 'right', className: '-right-3 top-1/2 -translate-y-1/2 cursor-ew-resize' },
    { handle: 'bottom-right', className: '-bottom-3 -right-3 cursor-nwse-resize' },
    { handle: 'bottom', className: 'bottom-[-0.75rem] left-1/2 -translate-x-1/2 cursor-ns-resize' },
    { handle: 'bottom-left', className: '-bottom-3 -left-3 cursor-nesw-resize' },
    { handle: 'left', className: '-left-3 top-1/2 -translate-y-1/2 cursor-ew-resize' },
  ];

  const imageStyle =
    imageBounds &&
    ({
      height: `${imageBounds.height}px`,
      left: `${imageBounds.x}px`,
      top: `${imageBounds.y}px`,
      width: `${imageBounds.width}px`,
    } satisfies React.CSSProperties);

  return (
    <div ref={containerRef} className="relative size-full touch-none overflow-hidden">
      {imageStyle ? (
        <img
          src={imageUrl}
          alt=""
          className="absolute select-none object-contain"
          draggable={false}
          style={imageStyle}
        />
      ) : null}

      {cropStyle ? (
        <div
          className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(40,22,29,0.45)]"
          style={cropStyle}
        >
          <button
            type="button"
            className="absolute inset-0 cursor-move touch-none"
            aria-label="Zuschnitt verschieben"
            onPointerDown={(event) => startDrag('move', event)}
          />
          {handles.map(({ className, handle }) => (
            <button
              key={handle}
              type="button"
              className={`absolute z-10 size-6 touch-none rounded-full border-2 border-white bg-petal-500 shadow-soft ${className}`}
              aria-label={`Zuschnittgröße ändern ${handle}`}
              onPointerDown={(event) => startDrag(handle, event)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
