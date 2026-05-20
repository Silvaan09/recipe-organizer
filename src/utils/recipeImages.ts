const localRecipeImages: Record<string, { alt: string; src: string }> = {
  'mock-breakfast-cover': {
    alt: 'Vorschau einer Erdbeer-Frühstücksschale',
    src: `${import.meta.env.BASE_URL}recipe-images/mock-breakfast-cover.svg`,
  },
  'mock-chicken-cover': {
    alt: 'Vorschau von Zitronen-Kräuter-Hähnchen',
    src: `${import.meta.env.BASE_URL}recipe-images/mock-chicken-cover.svg`,
  },
  'mock-pasta-cover': {
    alt: 'Vorschau von Rosmarin-Tomaten-Pasta',
    src: `${import.meta.env.BASE_URL}recipe-images/mock-pasta-cover.svg`,
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
