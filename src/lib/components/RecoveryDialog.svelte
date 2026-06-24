<script lang="ts">
  import { fade, scale } from "svelte/transition";
  import type { DocumentSnapshot } from "../services/document-session.js";
  import { t, type LanguageCode } from "../utils/i18n.js";

  let { show, snapshots, language, onrestore, ondiscard, onclose } = $props<{
    show: boolean;
    snapshots: DocumentSnapshot[];
    language: LanguageCode;
    onrestore: (snapshot: DocumentSnapshot) => void;
    ondiscard: (snapshot: DocumentSnapshot) => void;
    onclose: () => void;
  }>();
</script>

{#if show}
  <div class="backdrop" transition:fade={{ duration: 120 }} role="presentation">
    <div
      class="dialog"
      transition:scale={{ duration: 160, start: 0.96 }}
      role="dialog"
      aria-modal="true"
    >
      <header>
        <div>
          <h2>{t("recovery.title", language)}</h2>
          <p>{t("recovery.description", language)}</p>
        </div>
        <button
          class="close"
          onclick={onclose}
          aria-label={t("common.close", language)}>×</button
        >
      </header>
      <div class="documents">
        {#each snapshots as snapshot (snapshot.id)}
          <div class="document">
            <div>
              <strong>{snapshot.title}</strong>
              <span
                >{snapshot.path ||
                  t("recovery.unsavedDocument", language)}</span
              >
              <small>{new Date(snapshot.updatedAt).toLocaleString()}</small>
            </div>
            <div class="actions">
              <button onclick={() => ondiscard(snapshot)}
                >{t("recovery.discard", language)}</button
              >
              <button class="primary" onclick={() => onrestore(snapshot)}
                >{t("recovery.recover", language)}</button
              >
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 32000;
    display: grid;
    place-items: center;
    padding: 20px;
    background: rgba(0, 0, 0, 0.45);
  }

  .dialog {
    width: min(520px, 100%);
    max-height: min(460px, 86vh);
    overflow: hidden;
    border: 1px solid var(--color-border-default);
    border-radius: 12px;
    background: var(--color-canvas-overlay);
    color: var(--color-fg-default);
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.4);
    font-family: var(--win-font);
  }

  header,
  .document,
  .actions {
    display: flex;
    align-items: center;
  }

  header {
    justify-content: space-between;
    padding: 14px 16px;
    border-bottom: 1px solid var(--color-border-muted);
  }

  h2 {
    font-size: 16px;
    line-height: 1.3;
  }

  p {
    font-size: 13px;
    line-height: 1.4;
  }

  h2,
  p {
    margin: 0;
  }

  header p,
  .document span,
  .document small {
    display: block;
    margin-top: 4px;
    color: var(--color-fg-muted);
  }

  .documents {
    max-height: 340px;
    overflow: auto;
    padding: 6px;
  }

  .document {
    justify-content: space-between;
    gap: 14px;
    padding: 10px;
    border-radius: 6px;
  }

  .document:hover {
    background: var(--color-canvas-subtle);
  }

  .actions {
    gap: 8px;
  }

  button {
    padding: 6px 10px;
    border: 1px solid var(--color-border-default);
    border-radius: 6px;
    background: var(--color-canvas-subtle);
    color: var(--color-fg-default);
    cursor: pointer;
  }

  button.primary {
    background: var(--color-accent-fg);
    color: var(--color-btn-fg);
  }

  button.close {
    border: 0;
    background: transparent;
    font-size: 20px;
  }
</style>
