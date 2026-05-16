const previewStyles = [
  'from-petal-200 via-petal-100 to-herb-100 text-petal-700',
  'from-amber-100 via-petal-100 to-petal-200 text-cocoa-700',
  'from-herb-100 via-white to-petal-100 text-herb-700',
];

const previewLabels = ['Fresh', 'Cozy', 'Yum'];

export function getRecipePreviewStyle(imageId: string) {
  const hash = [...imageId].reduce((total, char) => total + char.charCodeAt(0), 0);

  return previewStyles[hash % previewStyles.length];
}

export function getRecipePreviewLabel(imageId: string) {
  const hash = [...imageId].reduce((total, char) => total + char.charCodeAt(0), 0);

  return previewLabels[hash % previewLabels.length];
}
