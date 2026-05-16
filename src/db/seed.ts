import type { NewRecipeInput } from '../types/recipe';

export const mockRecipes: NewRecipeInput[] = [
  {
    title: 'Rosemary Tomato Pasta',
    keywords: ['pasta', 'tomato', 'rosemary', 'weeknight', 'vegetarian'],
    imageIds: ['mock-pasta-cover'],
  },
  {
    title: 'Strawberry Breakfast Bowl',
    keywords: ['breakfast', 'strawberry', 'yogurt', 'quick', 'fresh'],
    imageIds: ['mock-breakfast-cover'],
  },
  {
    title: 'Lemon Herb Chicken',
    keywords: ['chicken', 'lemon', 'herbs', 'dinner', 'meal prep'],
    imageIds: ['mock-chicken-cover'],
  },
];
