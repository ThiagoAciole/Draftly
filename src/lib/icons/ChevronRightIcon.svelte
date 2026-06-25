<script lang="ts">
  let { style = "" } = $props<{ style?: string }>();
</script>

<svg
  viewBox="0 0 24 24"
  width="14"
  height="14"
  fill="none"
  stroke="currentColor"
  stroke-width="2.25"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
  {style}
>
  <path d="M9 18l6-6-6-6"></path>
</svg>
