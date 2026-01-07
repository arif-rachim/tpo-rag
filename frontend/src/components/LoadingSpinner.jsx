export default function LoadingSpinner({ size = 'md', text = '' }) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  const spinnerSize = sizes[size] || sizes.md;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative">
        <div className={`${spinnerSize} border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin`}></div>
      </div>
      {text && (
        <p className="mt-3 text-sm text-gray-600 animate-pulse">{text}</p>
      )}
    </div>
  );
}
