import { Plus } from "lucide-react";
import { ListSectionHeader } from "@/shared/components/ListSectionHeader";
import { Button } from "@/shared/ui/button";
import type { AudiovisualProject } from "../types/audiovisual.types";
import { defaultChecklist, defaultScenes, defaultShots } from "../mock/audiovisual.mock";

function Gallery({ title, images = [], more }: { title: string; images?: string[]; more: number }) {
  const visible = images.slice(0, 3);
  const fallback = [
    "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=160&q=80",
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=160&q=80",
    "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=160&q=80",
  ];

  return (
    <div className="mt-5">
      <p className="mb-3 text-[10px] text-muted-foreground">{title}</p>
      <div className="flex gap-2">
        {(visible.length ? visible : fallback).slice(0, 3).map((src, i) => (
          <img key={src + i} src={src} className="h-16 w-16 rounded-md border border-border object-cover" />
        ))}
        <div className="flex h-16 w-16 items-center justify-center rounded-md border border-border bg-muted text-sm font-semibold text-foreground">
          +{more}
        </div>
      </div>
    </div>
  );
}

export function AudiovisualScriptTab({ project }: { project: AudiovisualProject }) {
  const scenes = project.scenes?.length ? project.scenes : defaultScenes;
  const shots = project.shot_list?.length ? project.shot_list : defaultShots;
  const checklist = project.checklist?.length ? project.checklist : defaultChecklist;

  return (
    <div className="grid grid-cols-[310px_1fr_430px] gap-3 p-4">
      <section className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">Roteiro Criativo</div>
        <div className="p-4 text-xs text-muted-foreground">
          <p className="mb-3 text-[10px] text-muted-foreground">Conceito</p>
          <p className="leading-relaxed">
            {project.concept ?? "Clipe automotivo com performance do artista em cenários urbanos e carros esportivos."}
          </p>
          <p className="mb-3 mt-5 text-[10px] text-muted-foreground">Objetivo</p>
          <p className="leading-relaxed">{project.objective ?? "Transmitir energia, velocidade e lifestyle do artista."}</p>
          <Gallery title="Referências" images={project.references} more={3} />
          <div className="my-5 h-px bg-muted" />
          <Gallery title="Moodboard" images={project.moodboard} more={5} />
        </div>
      </section>

      <section className="space-y-3">
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">Roteiro de Gravação (Storyboard)</h3>
            <Button size="sm" variant="outline" className="h-7 border-border bg-card text-xs text-foreground">
              <Plus className="mr-1 h-3 w-3" />
              Adicionar Cena
            </Button>
          </div>
          <ListSectionHeader
            title="Roteiro de Gravação"
            count={scenes.length}
            description="Acompanhe cenas, ambientes, participantes, planos e duração estimada"
            className="px-4 pt-4"
          />
          <table className="w-full text-left text-xs">
            <thead className="text-[10px] text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Cena</th>
                <th className="px-2 py-3">Ambiente</th>
                <th className="px-2 py-3">Descrição da Cena</th>
                <th className="px-2 py-3">Participantes</th>
                <th className="px-2 py-3">Tipo de Plano</th>
                <th className="px-2 py-3">Mov. de Câmera</th>
                <th className="px-2 py-3">Duração Est.</th>
                <th className="px-2 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {scenes.map((scene) => (
                <tr key={scene.id} className="border-t border-border">
                  <td className="px-4 py-3 text-foreground">{scene.scene}</td>
                  <td className="px-2 py-3 text-muted-foreground">{scene.environment}</td>
                  <td className="px-2 py-3 text-muted-foreground">{scene.description}</td>
                  <td className="px-2 py-3 text-muted-foreground">{scene.participants}</td>
                  <td className="px-2 py-3 text-muted-foreground">{scene.shot_type}</td>
                  <td className="px-2 py-3 text-muted-foreground">{scene.camera_movement}</td>
                  <td className="px-2 py-3 text-muted-foreground">{scene.estimated_duration}</td>
                  <td className="px-2 py-3 text-muted-foreground">{scene.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">Observações do Roteiro</div>
          <p className="p-4 text-xs text-muted-foreground">
            {project.observations ?? "Gravação noturna. Levar iluminação portátil. Confirmar autorização de locação na favela."}
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">Shot List</h3>
            <Button size="sm" variant="outline" className="h-7 border-border bg-card text-xs text-foreground">
              <Plus className="mr-1 h-3 w-3" />
              Adicionar Shot
            </Button>
          </div>
          <ListSectionHeader
            title="Shot List"
            count={shots.length}
            description="Acompanhe planos, movimentos, duração e status de cada shot"
            className="px-4 pt-4"
          />
          <table className="w-full text-left text-xs">
            <thead className="text-[10px] text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Shot</th>
                <th className="px-2 py-3">Tipo de Plano</th>
                <th className="px-2 py-3">Movimento</th>
                <th className="px-2 py-3">Duração</th>
                <th className="px-2 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {shots.map((shot) => (
                <tr key={shot.id} className="border-t border-border">
                  <td className="px-4 py-3 text-foreground">{shot.shot}</td>
                  <td className="px-2 py-3 text-muted-foreground">{shot.shot_type}</td>
                  <td className="px-2 py-3 text-muted-foreground">{shot.movement}</td>
                  <td className="px-2 py-3 text-muted-foreground">{shot.duration}</td>
                  <td className="px-2 py-3">
                    <span className="rounded bg-muted px-2 py-1 text-[10px] text-foreground">{shot.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">Checklist de Gravação</h3>
            <Button size="sm" variant="outline" className="h-7 border-border bg-card text-xs text-foreground">
              Editar Checklist
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 p-4">
            {checklist.map((item) => (
              <label key={item.id} className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex h-4 w-4 items-center justify-center rounded bg-primary text-[10px] text-foreground">✓</span>
                {item.label}
              </label>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
