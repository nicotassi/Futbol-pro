import { useState } from 'react';
import { Plus, Star, Zap } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Section } from '@/components/layout/Section';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Badge } from '@/components/ui/Badge';
import { Chip } from '@/components/ui/Chip';
import { StatTile } from '@/components/ui/StatTile';
import { ProgressBar, ProgressRing } from '@/components/ui/Progress';
import { Avatar } from '@/components/ui/Avatar';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { Segmented } from '@/components/ui/Segmented';
import { Sheet } from '@/components/ui/Sheet';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { PhaseNotice } from '@/components/feedback/PhaseNotice';
import { LogoMark, Wordmark } from '@/components/brand/Logo';

const swatches = [
  ['paper', 'bg-paper'],
  ['surface', 'bg-surface'],
  ['sand', 'bg-sand'],
  ['line', 'bg-line'],
  ['ink', 'bg-ink'],
  ['ink-2', 'bg-ink-2'],
  ['muted', 'bg-muted'],
  ['gold', 'bg-gold'],
  ['gold-light', 'bg-gold-light'],
  ['gold-strong', 'bg-gold-strong'],
  ['gold-soft', 'bg-gold-soft'],
  ['success', 'bg-success'],
  ['warning', 'bg-warning-bright'],
  ['danger', 'bg-danger'],
];

/** Catálogo visual de componentes (solo en desarrollo: /_design). Los valores son de muestra. */
export default function DesignSystemPage() {
  const [seg, setSeg] = useState<'a' | 'b' | 'c'>('a');
  const [chip, setChip] = useState(true);
  const [sheet, setSheet] = useState(false);

  return (
    <>
      <PageHeader
        eyebrow="Solo desarrollo"
        title="Sistema de diseño"
        description="Valores de muestra para revisar estilos."
      />

      <Section title="Marca">
        <Card className="flex flex-wrap items-center gap-6">
          <LogoMark size={64} />
          <Wordmark showTagline />
          <div className="rounded-xl bg-ink p-3">
            <Wordmark tone="dark" />
          </div>
        </Card>
      </Section>

      <Section title="Colores">
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {swatches.map(([name, cls]) => (
            <div key={name} className="text-center text-[0.6875rem] text-muted">
              <div className={`h-12 rounded-lg border border-line ${cls}`} />
              {name}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Tipografía">
        <Card>
          <p className="eyebrow text-gold-strong">Eyebrow</p>
          <h1 className="text-3xl font-semibold">Título Outfit 30</h1>
          <h2 className="text-xl font-semibold">Subtítulo Outfit 20</h2>
          <p className="mt-1">Texto Inter 16 — Entrená. Aprendé. Evolucioná.</p>
          <p className="text-sm text-muted">Texto secundario Inter 14</p>
        </Card>
      </Section>

      <Section title="Botones">
        <div className="flex flex-wrap gap-2">
          <Button>Primario</Button>
          <Button variant="accent" leadingIcon={<Zap className="size-4" />}>
            Acento
          </Button>
          <Button variant="secondary">Secundario</Button>
          <Button variant="ghost">Fantasma</Button>
          <Button variant="danger">Peligro</Button>
          <Button disabled>Deshabilitado</Button>
          <Button size="sm" leadingIcon={<Plus className="size-4" />}>
            Chico
          </Button>
          <Button size="lg">Grande</Button>
          <IconButton label="Favorito" icon={<Star className="size-5" />} />
        </div>
      </Section>

      <Section title="Badges y chips">
        <div className="flex flex-wrap gap-2">
          <Badge>Neutral</Badge>
          <Badge tone="gold">Dorado</Badge>
          <Badge tone="dark">Oscuro</Badge>
          <Badge tone="success">Confirmado</Badge>
          <Badge tone="warning">Pendiente</Badge>
          <Badge tone="danger">Rojo</Badge>
          <Chip selected={chip} onClick={() => setChip(!chip)}>
            Chip seleccionable
          </Chip>
        </div>
      </Section>

      <Section title="Indicadores">
        <div className="grid grid-cols-3 gap-3">
          <StatTile label="Minutos" value={120} unit="min" />
          <StatTile label="Sesiones" value={4} />
          <StatTile label="Sin datos" value={null} />
        </div>
        <div className="mt-4 flex items-center gap-6">
          <ProgressRing value={65} label="Ejemplo">
            <span className="text-sm font-semibold">65%</span>
          </ProgressRing>
          <ProgressBar value={40} label="Ejemplo" />
          <Avatar name="Benja" />
        </div>
      </Section>

      <Section title="Formularios">
        <Card className="flex flex-col gap-4">
          <Input label="Rival" placeholder="Nombre del equipo" hint="Opcional" />
          <Input label="Minutos jugados" type="number" error="Ingresá un número entre 0 y 90" />
          <Select label="Posición" defaultValue="mid">
            <option value="mid">Mediocampista</option>
            <option value="def">Defensor</option>
          </Select>
          <Textarea label="Observaciones" />
          <Segmented
            label="Demo"
            value={seg}
            onChange={setSeg}
            options={[
              { value: 'a', label: 'Día' },
              { value: 'b', label: 'Semana' },
              { value: 'c', label: 'Mes' },
            ]}
          />
          <Button variant="secondary" onClick={() => setSheet(true)}>
            Abrir hoja inferior
          </Button>
        </Card>
      </Section>

      <Section title="Estados">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Vacío" />
            <EmptyState
              icon={<Star className="size-6" />}
              title="Sin datos"
              description="Descripción del estado vacío."
            />
          </Card>
          <Card>
            <CardHeader title="Error" />
            <ErrorState onRetry={() => undefined} />
          </Card>
          <Card>
            <CardHeader title="Cargando" />
            <LoadingState rows={2} />
          </Card>
          <Card>
            <CardHeader title="Skeleton" />
            <Skeleton className="h-24" />
          </Card>
        </div>
        <PhaseNotice className="mt-4" phase={3} feature="Una función futura" />
      </Section>

      <Sheet
        open={sheet}
        onClose={() => setSheet(false)}
        title="Hoja inferior"
        footer={
          <Button block onClick={() => setSheet(false)}>
            Listo
          </Button>
        }
      >
        <p className="text-sm text-muted">Contenido de ejemplo.</p>
      </Sheet>
    </>
  );
}
