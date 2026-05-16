import type { NewRecipeInput } from '../types/recipe';

export const mockRecipes: NewRecipeInput[] = [
  {
    title: 'Rosemary Tomato Pasta',
    keywords: ['pasta', 'tomato', 'rosemary', 'weeknight', 'vegetarian'],
    previewImageId: 'mock-pasta-cover',
    imageIds: [],
  },
  {
    title: 'Strawberry Breakfast Bowl',
    keywords: ['breakfast', 'strawberry', 'yogurt', 'quick', 'fresh'],
    previewImageId: 'mock-breakfast-cover',
    imageIds: [],
  },
  {
    title: 'Lemon Herb Chicken',
    keywords: ['chicken', 'lemon', 'herbs', 'dinner', 'meal prep'],
    previewImageId: 'mock-chicken-cover',
    imageIds: [],
  },
];
