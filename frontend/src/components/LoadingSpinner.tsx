export function LoadingSpinner({ text }: { text?: string }) {
  return (
    <div className="loading-spinner-wrap">
      <div className="loading-spinner" />
      {text && <p className="loading-text">{text}</p>}
    </div>
  );
}
