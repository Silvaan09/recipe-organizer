import type { RecipeImagePosition } from '../types/recipe';

export function toImageObjectPosition(position?: RecipeImagePosition) {
  if (!position) {
    return undefined;
  }

  return `${position.x}% ${position.y}%`;
}
