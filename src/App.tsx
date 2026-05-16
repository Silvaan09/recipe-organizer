import { useMemo, useState } from 'react';

import { AppShell } from './components/layout/AppShell';
import { ArchivePage } from './pages/ArchivePage';
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
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | undefined>();
  const [selectedArchivedRecipeId, setSelectedArchivedRecipeId] = useState<string | undefined>();

  const pages = useMemo(
    () => ({
      home: (
        <HomePage
          onAddRecipe={() => {
            setEditingRecipeId(undefined);
            setIsRecipeFormOpen(true);
            setIsSettingsOpen(false);
            setIsArchiveOpen(false);
            setSelectedRecipeId(undefined);
            setSelectedArchivedRecipeId(undefined);
          }}
          onOpenRecipe={(recipeId) => {
            setSelectedRecipeId(recipeId);
            setIsRecipeFormOpen(false);
            setIsSettingsOpen(false);
            setIsArchiveOpen(false);
            setSelectedArchivedRecipeId(undefined);
          }}
        />
      ),
      recipes: (
        <RecipesPage
          onAddRecipe={() => {
            setEditingRecipeId(undefined);
            setIsRecipeFormOpen(true);
            setIsSettingsOpen(false);
            setIsArchiveOpen(false);
            setSelectedRecipeId(undefined);
            setSelectedArchivedRecipeId(undefined);
          }}
          onOpenRecipe={(recipeId) => {
            setSelectedRecipeId(recipeId);
            setIsRecipeFormOpen(false);
            setIsSettingsOpen(false);
            setIsArchiveOpen(false);
            setSelectedArchivedRecipeId(undefined);
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
    setSelectedArchivedRecipeId(undefined);
    setIsSettingsOpen(true);
    setIsArchiveOpen(false);
  }

  function closeSettings() {
    setIsSettingsOpen(false);
    setIsArchiveOpen(false);
  }

  function openArchive() {
    setSelectedArchivedRecipeId(undefined);
    setIsSettingsOpen(false);
    setIsArchiveOpen(true);
  }

  function openRecipeEditor(recipeId: string) {
    setEditingRecipeId(recipeId);
    setIsRecipeFormOpen(true);
    setIsSettingsOpen(false);
    setIsArchiveOpen(false);
    setSelectedArchivedRecipeId(undefined);
  }

  function handleSavedRecipe(recipe: Recipe) {
    setSelectedRecipeId(recipe.id);
    closeRecipeForm();
  }

  return (
    <AppShell
      activeTab={activeTab}
      onSettingsClick={openSettings}
      showBottomTabs={!isRecipeFormOpen && !selectedRecipeId && !selectedArchivedRecipeId}
      onTabChange={(nextTab) => {
        closeRecipeForm();
        closeSettings();
        setIsArchiveOpen(false);
        setSelectedRecipeId(undefined);
        setSelectedArchivedRecipeId(undefined);
        setActiveTab(nextTab);
      }}
    >
      {selectedArchivedRecipeId ? (
        <RecipeDetailPage
          isArchived
          recipeId={selectedArchivedRecipeId}
          onBack={() => setSelectedArchivedRecipeId(undefined)}
          onDeleted={() => setSelectedArchivedRecipeId(undefined)}
          onEdit={openRecipeEditor}
          onRestored={() => setSelectedArchivedRecipeId(undefined)}
        />
      ) : isArchiveOpen ? (
        <ArchivePage
          onClose={() => {
            setIsArchiveOpen(false);
            setIsSettingsOpen(true);
          }}
          onOpenRecipe={(recipeId) => setSelectedArchivedRecipeId(recipeId)}
        />
      ) : isSettingsOpen ? (
        <SettingsPage onClose={closeSettings} onOpenArchive={openArchive} />
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
