type KeywordsInputProps = {
  keywords: string[];
  onChange: (value: string) => void;
  value: string;
};

export function KeywordsInput({ keywords, onChange, value }: KeywordsInputProps) {
  return (
    <div>
      <label htmlFor="recipe-keywords" className="text-sm font-bold text-cocoa-700">
        Keywords
      </label>
      <input
        id="recipe-keywords"
        type="text"
        value={value}
        placeholder="pasta, quick, vegetarian"
        className="mt-2 min-h-12 w-full rounded-lg border border-petal-100 bg-white px-4 text-base text-cocoa-900 shadow-soft outline-none transition placeholder:text-cocoa-700/45 focus:border-petal-300 focus:ring-2 focus:ring-petal-100"
        onChange={(event) => onChange(event.target.value)}
      />
      <div className="mt-3 flex min-h-8 flex-wrap gap-2">
        {keywords.map((keyword) => (
          <span
            key={keyword}
            className="rounded-full bg-petal-100 px-3 py-1 text-xs font-bold text-petal-700"
          >
            {keyword}
          </span>
        ))}
      </div>
    </div>
  );
}
