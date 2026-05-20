import imageCompression from 'browser-image-compression';

import type { ImageCropArea, ProcessedRecipeImage } from './types';

const JPG_TYPE = 'image/jpeg';
const DOWNSCALE_RATIO = 0.65;
const MAX_IMAGE_SIZE_MB = 0.58;
const THUMBNAIL_SIZE = 192;

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Bild konnte nicht geladen werden.'));
    };

    image.src = objectUrl;
  });
}

function canvasToJpgFile(canvas: HTMLCanvasElement, fileName: string): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Bild konnte nicht in JPG umgewandelt werden.'));
          return;
        }

        resolve(new File([blob], fileName, { type: JPG_TYPE, lastModified: Date.now() }));
      },
      JPG_TYPE,
      0.9,
    );
  });
}

function toJpgFileName(fileName: string) {
  return `${fileName.replace(/\.[^.]+$/, '') || 'recipe-image'}.jpg`;
}

function normalizeRotation(rotation = 0) {
  return ((Math.round(rotation / 90) * 90) % 360 + 360) % 360;
}

function createRotatedSource(image: HTMLImageElement, rotation: number) {
  const normalizedRotation = normalizeRotation(rotation);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { alpha: false });
  const isSideways = normalizedRotation === 90 || normalizedRotation === 270;

  if (!context) {
    throw new Error('Bilddrehung wird in diesem Browser nicht unterstützt.');
  }

  canvas.width = isSideways ? image.naturalHeight : image.naturalWidth;
  canvas.height = isSideways ? image.naturalWidth : image.naturalHeight;
  context.fillStyle = '#fff7f8';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate((normalizedRotation * Math.PI) / 180);
  context.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);

  return canvas;
}

function getCropSource(
  sourceSize: { height: number; width: number },
  cropArea?: ImageCropArea,
) {
  if (!cropArea) {
    return {
      height: sourceSize.height,
      width: sourceSize.width,
      x: 0,
      y: 0,
    };
  }

  const x = Math.max(0, Math.round(cropArea.x));
  const y = Math.max(0, Math.round(cropArea.y));

  return {
    height: Math.max(1, Math.min(Math.round(cropArea.height), sourceSize.height - y)),
    width: Math.max(1, Math.min(Math.round(cropArea.width), sourceSize.width - x)),
    x,
    y,
  };
}

async function createThumbnailFile(file: Blob, fileName: string): Promise<File> {
  const image = await loadImage(file);
  const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
  const sourceX = Math.max(0, Math.round((image.naturalWidth - sourceSize) / 2));
  const sourceY = Math.max(0, Math.round((image.naturalHeight - sourceSize) / 2));
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { alpha: false });

  if (!context) {
    throw new Error('Thumbnail-Erstellung wird in diesem Browser nicht unterstützt.');
  }

  canvas.width = THUMBNAIL_SIZE;
  canvas.height = THUMBNAIL_SIZE;
  context.fillStyle = '#fff7f8';
  context.fillRect(0, 0, THUMBNAIL_SIZE, THUMBNAIL_SIZE);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceSize,
    sourceSize,
    0,
    0,
    THUMBNAIL_SIZE,
    THUMBNAIL_SIZE,
  );

  const thumbnailFile = await canvasToJpgFile(canvas, fileName);

  return imageCompression(thumbnailFile, {
    alwaysKeepResolution: true,
    fileType: JPG_TYPE,
    initialQuality: 0.74,
    maxIteration: 8,
    maxSizeMB: 0.08,
    useWebWorker: true,
  });
}

export async function generateRecipeImageThumbnail(file: Blob, fileName = 'recipe-thumbnail.jpg') {
  return createThumbnailFile(file, toJpgFileName(fileName));
}

export async function processRecipeImage(
  file: File,
  cropArea?: ImageCropArea,
): Promise<ProcessedRecipeImage> {
  const image = await loadImage(file);
  const rotatedSource = createRotatedSource(image, cropArea?.rotation ?? 0);
  const source = getCropSource(
    {
      height: rotatedSource.height,
      width: rotatedSource.width,
    },
    cropArea,
  );
  const outputWidth = Math.max(1, Math.round(source.width * DOWNSCALE_RATIO));
  const outputHeight = Math.max(1, Math.round(source.height * DOWNSCALE_RATIO));
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { alpha: false });

  if (!context) {
    throw new Error('Bildverarbeitung wird in diesem Browser nicht unterstützt.');
  }

  canvas.width = outputWidth;
  canvas.height = outputHeight;
  context.fillStyle = '#fff7f8';
  context.fillRect(0, 0, outputWidth, outputHeight);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(
    rotatedSource,
    source.x,
    source.y,
    source.width,
    source.height,
    0,
    0,
    outputWidth,
    outputHeight,
  );

  const jpgFile = await canvasToJpgFile(canvas, toJpgFileName(file.name));
  const compressedFile = await imageCompression(jpgFile, {
    alwaysKeepResolution: false,
    fileType: JPG_TYPE,
    initialQuality: 0.86,
    maxIteration: 10,
    maxSizeMB: MAX_IMAGE_SIZE_MB,
    useWebWorker: true,
  });
  const optimizedFile = new File([compressedFile], toJpgFileName(file.name), {
    type: JPG_TYPE,
    lastModified: Date.now(),
  });
  const thumbnailFile = await createThumbnailFile(optimizedFile, toJpgFileName(file.name));

  return {
    file: optimizedFile,
    height: outputHeight,
    originalSize: file.size,
    previewUrl: URL.createObjectURL(optimizedFile),
    size: optimizedFile.size,
    thumbnailFile,
    thumbnailSize: thumbnailFile.size,
    width: outputWidth,
  };
}
