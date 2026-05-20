import { ArrowLeft, ArrowRight, Camera, Crop, ImagePlus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import type { ImageDraft } from '../../hooks/useRecipeForm';
import type { ImageCropArea } from '../../services/image';
import { cn } from '../../utils/cn';
import { toImageObjectPosition } from '../../utils/imagePosition';
import { ImageCropDialog } from './ImageCropDialog';

type ImageUploadInputProps = {
  cameraLabel?: string;
  cropMode?: 'display' | 'recipe';
  description?: string;
  error?: string;
  images: ImageDraft[];
  multiple?: boolean;
  onAddFiles: (files: FileList) => void;
  onCropImage: (tempId: string, cropArea: ImageCropArea) => Promise<void>;
  onMoveImage: (tempId: string, direction: 'left' | 'right') => void;
  onRemoveImage: (tempId: string) => void;
  previewAspectClass?: string;
  title?: string;
  uploadLabel?: string;
};

export function ImageUploadInput({
  cameraLabel = 'Handyaufnahme',
  cropMode = 'recipe',
  description = 'Mehrere Bilder sind möglich',
  error,
  images,
  multiple = true,
  onAddFiles,
  onCropImage,
  onMoveImage,
  onRemoveImage,
  previewAspectClass = 'aspect-square',
  title = 'Bilder',
  uploadLabel = 'Mehrere Fotos',
}: ImageUploadInputProps) {
  const [croppingImage, setCroppingImage] = useState<ImageDraft>();

  return (
    <div>
      <div>
        <span className="text-sm font-bold text-cocoa-700">{title}</span>
        <p className="mt-1 text-xs font-medium leading-5 text-cocoa-700">{description}</p>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-petal-200 bg-white/80 px-4 text-center shadow-soft transition hover:border-petal-300 hover:bg-petal-50">
          <ImagePlus aria-hidden="true" size={25} className="text-petal-600" />
          <span className="mt-2 text-sm font-bold text-cocoa-900">Hochladen</span>
          <span className="mt-1 text-xs font-medium text-cocoa-700">{uploadLabel}</span>
          <input
            type="file"
            accept="image/*"
            multiple={multiple}
            className="sr-only"
            onChange={(event) => {
              if (event.target.files) {
                onAddFiles(event.target.files);
                event.target.value = '';
              }
            }}
          />
        </label>

        <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-petal-200 bg-white/80 px-4 text-center shadow-soft transition hover:border-petal-300 hover:bg-petal-50">
          <Camera aria-hidden="true" size={25} className="text-petal-600" />
          <span className="mt-2 text-sm font-bold text-cocoa-900">Kamera</span>
          <span className="mt-1 text-xs font-medium text-cocoa-700">{cameraLabel}</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(event) => {
              if (event.target.files) {
                onAddFiles(event.target.files);
                event.target.value = '';
              }
            }}
          />
        </label>
      </div>

      {error ? <p className="mt-2 text-sm font-semibold text-petal-700">{error}</p> : null}

      {images.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          {images.map((image, index) => (
            <div
              key={image.tempId}
              className="overflow-hidden rounded-lg border border-petal-100 bg-white shadow-soft"
            >
              <div className="relative">
                <img
                  src={image.previewUrl}
                  alt={image.alt}
                  className={cn(previewAspectClass, 'w-full object-cover')}
                  style={{
                    objectPosition: toImageObjectPosition(image.previewImagePosition),
                  }}
                />
                {image.status === 'processing' ? (
                  <div className="absolute inset-0 grid place-items-center bg-white/70 text-xs font-bold text-petal-700 backdrop-blur-sm">
                    Optimieren
                  </div>
                ) : null}
              </div>
              <div className="px-2 pt-2 text-xs font-semibold text-cocoa-700">
                {image.optimizedSize ? `${Math.round(image.optimizedSize / 1024)}KB JPG` : 'Vorbereiten'}
              </div>
              {image.error ? (
                <p className="px-2 pt-1 text-xs font-semibold text-petal-700">{image.error}</p>
              ) : null}
              <div className="grid grid-cols-4 gap-1 p-2">
                <button
                  type="button"
                  className="grid min-h-9 place-items-center rounded-md text-petal-700 transition hover:bg-petal-50 disabled:opacity-35"
                  aria-label="Bild nach links verschieben"
                  disabled={index === 0}
                  onClick={() => onMoveImage(image.tempId, 'left')}
                >
                  <ArrowLeft aria-hidden="true" size={17} />
                </button>
                <button
                  type="button"
                  className="grid min-h-9 place-items-center rounded-md text-petal-700 transition hover:bg-petal-50 disabled:opacity-35"
                  aria-label="Bild zuschneiden"
                  disabled={!image.sourceFile || image.status === 'processing'}
                  onClick={() => setCroppingImage(image)}
                >
                  <Crop aria-hidden="true" size={17} />
                </button>
                <button
                  type="button"
                  className="grid min-h-9 place-items-center rounded-md text-petal-700 transition hover:bg-petal-50"
                  aria-label="Bild entfernen"
                  onClick={() => onRemoveImage(image.tempId)}
                >
                  <Trash2 aria-hidden="true" size={17} />
                </button>
                <button
                  type="button"
                  className="grid min-h-9 place-items-center rounded-md text-petal-700 transition hover:bg-petal-50 disabled:opacity-35"
                  aria-label="Bild nach rechts verschieben"
                  disabled={index === images.length - 1}
                  onClick={() => onMoveImage(image.tempId, 'right')}
                >
                  <ArrowRight aria-hidden="true" size={17} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {croppingImage ? (
        <ImageCropDialog
          cropMode={cropMode}
          image={croppingImage}
          onApply={(cropArea) => onCropImage(croppingImage.tempId, cropArea)}
          onClose={() => setCroppingImage(undefined)}
        />
      ) : null}
    </div>
  );
}
