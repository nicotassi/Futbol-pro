import {
  ClipboardCheck,
  Download,
  Dumbbell,
  FileText,
  Flag,
  LayoutTemplate,
  Settings,
  Trophy,
  User,
  Watch,
} from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PhaseNotice } from '@/components/feedback/PhaseNotice';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { DevelopmentPhase } from '@/types/domain';

const tools: { label: string; icon: typeof User; phase: DevelopmentPhase }[] = [
  { label: 'Perfil del jugador', icon: User, phase: 2 },
  { label: 'Ejercicios', icon: Dumbbell, phase: 3 },
  { label: 'Entrenamientos y plantillas', icon: LayoutTemplate, phase: 3 },
  { label: 'Partidos', icon: Trophy, phase: 4 },
  { label: 'Objetivos', icon: Flag, phase: 4 },
  { label: 'Evaluaciones físicas y técnicas', icon: ClipboardCheck, phase: 4 },
  { label: 'Revisión de capturas del reloj', icon: Watch, phase: 5 },
  { label: 'Historial completo', icon: FileText, phase: 6 },
  { label: 'Exportar información', icon: Download, phase: 7 },
  { label: 'Configuración general', icon: Settings, phase: 2 },
];

export default function AdministrationPage() {
  useDocumentTitle('Administración');
  return (
    <>
      <TopBar title="Administración" backTo="/perfil" />
      <PageHeader
        eyebrow="Solo papá"
        title="Administración"
        description="Gestión de contenidos, revisiones y configuración."
      />
      <PhaseNotice phase={2} feature="El acceso protegido con usuario administrador" />
      <Card padded={false} className="mt-4">
        <ul className="divide-y divide-line">
          {tools.map(({ label, icon: Icon, phase }) => (
            <li key={label} className="flex items-center gap-3 px-4 py-3.5">
              <Icon className="size-5 text-gold-strong" aria-hidden />
              <span className="flex-1 font-medium">{label}</span>
              <Badge>Fase {phase}</Badge>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
