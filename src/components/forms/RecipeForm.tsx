import { Save, X } from 'lucide-react';

import { useRecipeForm } from '../../hooks/useRecipeForm';
import type { Recipe } from '../../types/recipe';
import { ImageUploadInput } from './ImageUploadInput';
import { KeywordsInput } from './KeywordsInput';
import { TextInput } from '../ui/TextInput';

type RecipeFormProps = {
  initialRecipe?: Recipe;
  onCancel: () => void;
  onSaved: (recipe: Recipe) => void;
};

export function RecipeForm({ initialRecipe, onCancel, onSaved }: RecipeFormProps) {
  const {
    addImageFiles,
    cropImage,
    errors,
    imageDrafts,
    isProcessingImages,
    isSaving,
    keywordText,
    moveImage,
    normalizedKeywords,
    previewImageDrafts,
    removeImage,
    saveRecipe,
    setKeywordText,
    setTitle,
    title,
  } = useRecipeForm({ initialRecipe, onSaved });

  return (
    <form
      className="rounded-lg border border-petal-100 bg-white p-4 shadow-soft"
      onSubmit={(event) => {
        event.preventDefault();
        void saveRecipe();
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-petal-600">
            {initialRecipe ? 'Edit recipe' : 'New recipe'}
          </p>
          <h2 className="mt-1 text-2xl font-bold">
            {initialRecipe ? initialRecipe.title : 'Add a tasty idea'}
          </h2>
        </div>
        <button
          type="button"
          className="grid size-10 shrink-0 place-items-center rounded-lg text-petal-700 transition hover:bg-petal-50"
          aria-label="Close recipe form"
          onClick={onCancel}
        >
          <X aria-hidden="true" size={20} />
        </button>
      </div>

      <div className="mt-6 flex flex-col gap-5">
        <ImageUploadInput
          cropMode="display"
          description="This optional image appears on recipe cards and search results."
          error={errors.previewImage}
          images={previewImageDrafts}
          multiple={false}
          previewAspectClass="aspect-[4/3]"
          title="Display preview image"
          uploadLabel="One display image"
          cameraLabel="Capture one"
          onAddFiles={(files) => addImageFiles('preview', files)}
          onCropImage={(tempId, cropArea) => cropImage('preview', tempId, cropArea)}
          onMoveImage={(tempId, direction) => moveImage('preview', tempId, direction)}
          onRemoveImage={(tempId) => removeImage('preview', tempId)}
        />

        <TextInput
          label="Title"
          value={title}
          placeholder="Rosemary tomato pasta"
          error={errors.title}
          onChange={(event) => setTitle(event.target.value)}
        />

        <KeywordsInput
          value={keywordText}
          keywords={normalizedKeywords}
          onChange={setKeywordText}
        />

        <ImageUploadInput
          cropMode="recipe"
          description="These images appear only in the full recipe gallery."
          error={errors.images}
          images={imageDrafts}
          previewAspectClass="aspect-[4/3]"
          title="Recipe gallery images"
          uploadLabel="Multiple photos"
          cameraLabel="Phone capture"
          onAddFiles={(files) => addImageFiles('recipe', files)}
          onCropImage={(tempId, cropArea) => cropImage('recipe', tempId, cropArea)}
          onMoveImage={(tempId, direction) => moveImage('recipe', tempId, direction)}
          onRemoveImage={(tempId) => removeImage('recipe', tempId)}
        />
      </div>

      <div className="mt-7 grid grid-cols-[1fr_auto] gap-3">
        <button
          type="submit"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-petal-500 px-4 text-sm font-bold text-white shadow-lg shadow-petal-300/40 transition hover:bg-petal-600 disabled:opacity-60"
          disabled={isSaving || isProcessingImages}
        >
          <Save aria-hidden="true" size={18} />
          {isSaving ? 'Saving' : isProcessingImages ? 'Optimizing' : 'Save recipe'}
        </button>
        <button
          type="button"
          className="min-h-12 rounded-lg border border-petal-100 bg-white px-4 text-sm font-bold text-petal-700 shadow-soft transition hover:bg-petal-50"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
