<script lang="ts">
  import SvgIcon from "../icons/SvgIcon.svelte";
  import { onMount } from "svelte";
  import { fly, fade } from "svelte/transition";

  let {
    message,
    type = "info",
    onremove,
  } = $props<{
    message: string;
    type?: "info" | "error" | "warning";
    onremove: () => void;
  }>();

  onMount(() => {
    const timer = setTimeout(onremove, 3000);
    return () => clearTimeout(timer);
  });
</script>

<div
  class="toast {type}"
  in:fly={{ y: 20, duration: 300 }}
  out:fade={{ duration: 200 }}
>
  <div class="toast-content">
    {#if type === "error"}
      <SvgIcon name="toast-1" />
    {:else if type === "warning"}
      <SvgIcon name="toast-2" />
    {:else}
      <SvgIcon name="toast-3" />
    {/if}
    <span class="message">{message}</span>
  </div>
  <button class="close-btn" onclick={onremove} aria-label="Close">
    <SvgIcon name="toast-4" />
  </button>
</div>

<style>
  .toast {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    background: rgba(32, 32, 32, 0.85);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: #ffffff;
    min-width: 280px;
    max-width: 400px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    user-select: none;
    pointer-events: auto;
    margin-bottom: 8px;
  }

  .toast.error {
    border-left: 4px solid #f85149;
  }
  .toast.warning {
    border-left: 4px solid #d29922;
  }
  .toast.info {
    border-left: 4px solid #58a6ff;
  }

  .toast-content {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .message {
    font-family: var(
      --win-font,
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      Roboto,
      sans-serif
    );
    font-size: 13.5px;
    font-weight: 400;
  }

  .close-btn {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.5);
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition:
      background 0.2s,
      color 0.2s;
  }

  .close-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #ffffff;
  }
</style>
