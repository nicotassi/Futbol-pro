import { useState } from 'react';
import { Segmented } from '@/components/ui/Segmented';
import { getStoredPreference, setPreference, type ThemePreference } from './theme';

/** Selector de apariencia: sistema, claro u oscuro. */
export function ThemeSwitch() {
  const [pref, setPref] = useState<ThemePreference>(getStoredPreference);
  return (
    <Segmented<ThemePreference>
      label="Apariencia"
      value={pref}
      onChange={(v) => {
        setPref(v);
        setPreference(v);
      }}
      options={[
        { value: 'system', label: 'Automático' },
        { value: 'light', label: 'Claro' },
        { value: 'dark', label: 'Oscuro' },
      ]}
    />
  );
}
