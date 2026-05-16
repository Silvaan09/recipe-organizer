import type { Area } from 'react-easy-crop';

export type ImageCropArea = Area;

export type ProcessedRecipeImage = {
  file: File;
  height: number;
  originalSize: number;
  previewUrl: string;
  size: number;
  thumbnailFile: File;
  thumbnailSize: number;
  width: number;
};
