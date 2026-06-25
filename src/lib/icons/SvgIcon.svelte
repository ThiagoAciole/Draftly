<script lang="ts">
  import { svgIcons, type SvgIconName } from "./icon-definitions.js";

  let { name } = $props<{ name: string }>();

  const icon = $derived(svgIcons[name as SvgIconName]);
</script>

<svg {...icon.attrs}>
  {@html icon.body}
</svg>
