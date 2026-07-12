export function EditorLoading() {
  return (
    <section className="editor-loading-skeleton" aria-busy="true" aria-label="Carregando editor">
      <div className="editor-loading-toolbar" aria-hidden="true">
        <span className="editor-skeleton editor-skeleton-button" />
        <span className="editor-skeleton editor-skeleton-button" />
        <span className="editor-skeleton editor-skeleton-button" />
        <span className="editor-skeleton editor-skeleton-divider" />
        <span className="editor-skeleton editor-skeleton-button is-wide" />
        <span className="editor-skeleton editor-skeleton-button" />
      </div>
      <div className="editor-loading-document">
        <span className="editor-skeleton editor-skeleton-eyebrow" />
        <span className="editor-skeleton editor-skeleton-heading" />
        <span className="editor-skeleton editor-skeleton-line" />
        <span className="editor-skeleton editor-skeleton-line is-long" />
        <span className="editor-skeleton editor-skeleton-line is-medium" />
        <span className="editor-skeleton editor-skeleton-line is-short" />
        <span className="editor-skeleton editor-skeleton-line is-long" />
      </div>
    </section>
  );
}
