import type { InputHTMLAttributes } from 'react';

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
  label: string;
};

export function TextInput({ error, id, label, ...props }: TextInputProps) {
  const inputId = id ?? label.toLocaleLowerCase().replace(/\s+/g, '-');

  return (
    <div>
      <label htmlFor={inputId} className="text-sm font-bold text-cocoa-700">
        {label}
      </label>
      <input
        id={inputId}
        className="mt-2 min-h-12 w-full rounded-lg border border-petal-100 bg-white px-4 text-base text-cocoa-900 shadow-soft outline-none transition placeholder:text-cocoa-700/45 focus:border-petal-300 focus:ring-2 focus:ring-petal-100"
        {...props}
      />
      {error ? <p className="mt-2 text-sm font-semibold text-petal-700">{error}</p> : null}
    </div>
  );
}
