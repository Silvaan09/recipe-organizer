import { useMemo, useState } from 'react';

import { AppShell } from './components/layout/AppShell';
import { HomePage } from './pages/HomePage';
import { RecipeDetailPage } from './pages/RecipeDetailPage';
import { RecipeFormPage } from './pages/RecipeFormPage';
import { RecipesPage } from './pages/RecipesPage';
import { SettingsPage } from './pages/SettingsPage';
import { useActiveTab } from './hooks/useActiveTab';
import type { Recipe } from './types/recipe';

export default function App() {
  const { activeTab, setActiveTab } = useActiveTab('home');
  const [editingRecipeId, setEditingRecipeId] = useState<string | undefined>();
  const [isRecipeFormOpen, setIsRecipeFormOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | undefined>();

  const pages = useMemo(
    () => ({
      home: (
        <HomePage
          onAddRecipe={() => {
            setEditingRecipeId(undefined);
            setIsRecipeFormOpen(true);
            setIsSettingsOpen(false);
            setSelectedRecipeId(undefined);
          }}
          onOpenRecipe={(recipeId) => {
            setSelectedRecipeId(recipeId);
            setIsRecipeFormOpen(false);
            setIsSettingsOpen(false);
          }}
        />
      ),
      recipes: (
        <RecipesPage
          onAddRecipe={() => {
            setEditingRecipeId(undefined);
            setIsRecipeFormOpen(true);
            setIsSettingsOpen(false);
            setSelectedRecipeId(undefined);
          }}
          onOpenRecipe={(recipeId) => {
            setSelectedRecipeId(recipeId);
            setIsRecipeFormOpen(false);
            setIsSettingsOpen(false);
          }}
        />
      ),
    }),
    [],
  );

  function closeRecipeForm() {
    setIsRecipeFormOpen(false);
    setEditingRecipeId(undefined);
  }

  function openSettings() {
    closeRecipeForm();
    setSelectedRecipeId(undefined);
    setIsSettingsOpen(true);
  }

  function closeSettings() {
    setIsSettingsOpen(false);
  }

  function openRecipeEditor(recipeId: string) {
    setEditingRecipeId(recipeId);
    setIsRecipeFormOpen(true);
    setIsSettingsOpen(false);
  }

  function handleSavedRecipe(recipe: Recipe) {
    setSelectedRecipeId(recipe.id);
    closeRecipeForm();
  }

  return (
    <AppShell
      activeTab={activeTab}
      onSettingsClick={openSettings}
      showBottomTabs={!isRecipeFormOpen && !selectedRecipeId}
      onTabChange={(nextTab) => {
        closeRecipeForm();
        closeSettings();
        setSelectedRecipeId(undefined);
        setActiveTab(nextTab);
      }}
    >
      {isSettingsOpen ? (
        <SettingsPage onClose={closeSettings} />
      ) : isRecipeFormOpen ? (
        <RecipeFormPage
          recipeId={editingRecipeId}
          onCancel={closeRecipeForm}
          onSaved={handleSavedRecipe}
        />
      ) : selectedRecipeId ? (
        <RecipeDetailPage
          recipeId={selectedRecipeId}
          onBack={() => setSelectedRecipeId(undefined)}
          onDeleted={() => setSelectedRecipeId(undefined)}
          onEdit={openRecipeEditor}
        />
      ) : (
        pages[activeTab]
      )}
    </AppShell>
  );
}
