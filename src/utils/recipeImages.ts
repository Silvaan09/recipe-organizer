const localRecipeImages: Record<string, { alt: string; src: string }> = {
  'mock-breakfast-cover': {
    alt: 'Strawberry breakfast bowl preview',
    src: '/recipe-images/mock-breakfast-cover.svg',
  },
  'mock-chicken-cover': {
    alt: 'Lemon herb chicken preview',
    src: '/recipe-images/mock-chicken-cover.svg',
  },
  'mock-pasta-cover': {
    alt: 'Rosemary tomato pasta preview',
    src: '/recipe-images/mock-pasta-cover.svg',
  },
};

const fallbackRecipeImageIds = Object.keys(localRecipeImages);

export function getLocalRecipeImage(imageId: string | undefined) {
  if (!imageId) {
    return undefined;
  }

  return localRecipeImages[imageId];
}

export function getFallbackRecipeImageId(seed: string) {
  const hash = [...seed].reduce((total, char) => total + char.charCodeAt(0), 0);

  return fallbackRecipeImageIds[hash % fallbackRecipeImageIds.length];
}
