import {
  Camera,
  CheckCircle2,
  ImagePlus,
  Info,
  ScanSearch,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { PageHeader } from '@/components/layout/PageHeader';
import { Section } from '@/components/layout/Section';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PhaseNotice } from '@/components/feedback/PhaseNotice';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const steps = [
  {
    icon: Camera,
    title: 'Capturas del reloj',
    text: 'Una o varias: resumen, gráfico cardíaco, zonas.',
  },
  {
    icon: UploadCloud,
    title: 'Subida privada',
    text: 'Se asocian a una sesión. Nadie más puede verlas.',
  },
  {
    icon: ScanSearch,
    title: 'Análisis con IA',
    text: 'Extrae solo los datos visibles y legibles. No inventa valores.',
  },
  {
    icon: CheckCircle2,
    title: 'Revisión de papá',
    text: 'Confirmar o corregir cada dato antes de sumarlo al historial.',
  },
];

const metrics = [
  'Duración',
  'FC promedio',
  'FC máxima',
  'Zonas de FC',
  'Calorías',
  'Distancia',
  'Velocidad',
  'Ritmo',
  'Pasos',
  'Fecha y hora',
];

export default function WatchUploadPage() {
  useDocumentTitle('Registro del reloj');
  return (
    <>
      <TopBar title="Registro del reloj" />
      <PageHeader
        eyebrow="Función prioritaria"
        title="Registro del reloj"
        description="Convertí las capturas del reloj en datos del entrenamiento, siempre con revisión humana."
      />
      <PhaseNotice phase={5} feature="La subida y el análisis de capturas" />

      <Card tone="plain" className="mt-4 border-dashed">
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <span
            className="grid size-14 place-items-center rounded-full bg-gold-soft text-gold-strong"
            aria-hidden
          >
            <ImagePlus className="size-6" />
          </span>
          <div>
            <p className="font-display font-semibold">Subir capturas</p>
            <p className="text-sm text-muted">PNG o JPG · varias por sesión</p>
          </div>
          <Button disabled leadingIcon={<UploadCloud className="size-4" />}>
            Elegir imágenes
          </Button>
        </div>
      </Card>

      <Section title="Cómo funciona">
        <ol className="flex flex-col gap-3">
          {steps.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="flex gap-3">
              <span
                className="grid size-10 shrink-0 place-items-center rounded-full bg-ink text-gold"
                aria-hidden
              >
                <Icon className="size-5" />
              </span>
              <div>
                <p className="font-medium">
                  <span className="text-muted">{i + 1}.</span> {title}
                </p>
                <p className="text-sm text-muted">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Datos que intenta reconocer">
        <ul className="flex flex-wrap gap-1.5">
          {metrics.map((m) => (
            <li key={m}>
              <Badge>{m}</Badge>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <Badge tone="warning">Pendiente de revisión</Badge>
          <Badge tone="success">Confirmado</Badge>
          <Badge tone="gold">Corregido</Badge>
        </div>
      </Section>

      <div className="mt-7 flex flex-col gap-2 text-xs text-muted">
        <p className="flex gap-2">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          Los datos del reloj son estimaciones del dispositivo, no mediciones clínicas.
        </p>
        <p className="flex gap-2">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
          Las imágenes se guardan en almacenamiento privado y solo se usan con fines deportivos.
        </p>
      </div>
    </>
  );
}
