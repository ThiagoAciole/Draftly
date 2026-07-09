import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown } from "lucide-react";

type Option<T extends string | number> = {
  value: T;
  label: string;
};

type SettingsSelectProps<T extends string | number> = {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  width?: number;
};

export function SettingsSelect<T extends string | number>({
  value,
  options,
  onChange,
  disabled,
  width,
}: SettingsSelectProps<T>) {
  const selected = options.find((o) => o.value === value);
  const label = selected?.label ?? String(value);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild disabled={disabled}>
        <button
          className={`settings-select-trigger ${disabled ? "is-disabled" : ""}`}
          type="button"
          style={width ? { minWidth: width } : undefined}
        >
          <span>{label}</span>
          <ChevronDown size={12} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="settings-select-dropdown" align="end" sideOffset={6}>
          {options.map((opt) => (
            <DropdownMenu.Item
              key={String(opt.value)}
              className={`settings-select-item ${opt.value === value ? "is-selected" : ""}`}
              onSelect={() => onChange(opt.value)}
            >
              {opt.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
