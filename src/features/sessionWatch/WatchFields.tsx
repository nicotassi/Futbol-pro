import { Input } from '@/components/ui/Field';
import { watchLabels, type WatchForm } from './watchData';

/** Campos para cargar a mano los datos del reloj (todos opcionales). */
export function WatchFields({
  form,
  onChange,
}: {
  form: WatchForm;
  onChange: (f: WatchForm) => void;
}) {
  const set = (k: keyof WatchForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...form, [k]: e.target.value });
  return (
    <fieldset className="flex flex-col gap-3 rounded-[14px] border border-line p-3">
      <legend className="px-1 text-sm font-semibold">Datos del reloj (opcional)</legend>
      <p className="text-xs text-muted">
        Cargá lo que muestra el reloj. Lo que dejes vacío queda “sin registrar”.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Ritmo cardíaco promedio"
          inputMode="numeric"
          hint="lpm"
          value={form.hr_avg}
          onChange={set('hr_avg')}
        />
        <Input
          label="Ritmo cardíaco máximo"
          inputMode="numeric"
          hint="lpm"
          value={form.hr_max}
          onChange={set('hr_max')}
        />
        <Input
          label="Calorías"
          inputMode="numeric"
          hint="kcal"
          value={form.calories}
          onChange={set('calories')}
        />
        <Input
          label="Carga de entrenamiento"
          inputMode="numeric"
          value={form.training_load}
          onChange={set('training_load')}
        />
      </div>
      <p className="text-sm font-medium">Efecto de entrenamiento</p>
      <div className="grid grid-cols-2 gap-3">
        <Input
          label={watchLabels.aerobic_effect}
          inputMode="decimal"
          hint="de 1,0 a 5,0"
          value={form.aerobic_effect}
          onChange={set('aerobic_effect')}
        />
        <Input
          label={watchLabels.anaerobic_effect}
          inputMode="decimal"
          hint="de 1,0 a 5,0"
          value={form.anaerobic_effect}
          onChange={set('anaerobic_effect')}
        />
      </div>
      <p className="text-sm font-medium">Zonas de ritmo cardíaco (%)</p>
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="VO2 máx"
          inputMode="decimal"
          hint="% del tiempo"
          value={form.zone_vo2max_pct}
          onChange={set('zone_vo2max_pct')}
        />
        <Input
          label="Intensivo"
          inputMode="decimal"
          hint="% del tiempo"
          value={form.zone_intensive_pct}
          onChange={set('zone_intensive_pct')}
        />
      </div>
    </fieldset>
  );
}
