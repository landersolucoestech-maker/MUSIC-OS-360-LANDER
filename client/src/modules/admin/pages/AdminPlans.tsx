import { useState } from "react";
import { AdminLayout } from "../layouts/AdminLayout";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/shared/ui/dialog";
import { cn } from "@/shared/lib/utils";
import { MOCK_PLANS } from "../data/mockAdmin";
import type { AdminPlan } from "../types";
import {
  Tag, Users, HardDrive, DollarSign, Check,
  Pencil, Plus, X, Save,
} from "lucide-react";

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

/* ── Edit Dialog ── */
interface EditDialogProps {
  plan: AdminPlan;
  onSave: (updated: AdminPlan) => void;
  onClose: () => void;
}

function EditPlanDialog({ plan, onSave, onClose }: EditDialogProps) {
  const [form, setForm] = useState<AdminPlan>({ ...plan });
  const [newFeature, setNewFeature] = useState("");

  function field(key: keyof AdminPlan, value: string | number) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function addFeature() {
    const v = newFeature.trim();
    if (!v) return;
    setForm(prev => ({ ...prev, features: [...prev.features, v] }));
    setNewFeature("");
  }

  function removeFeature(idx: number) {
    setForm(prev => ({ ...prev, features: prev.features.filter((_, i) => i !== idx) }));
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-[hsl(222_47%_6%)] border-white/[0.08] text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <div className="h-2.5 w-2.5 rounded-full" style={{ background: form.color }} />
            Editar Plano — {form.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Nome + Cor */}
          <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-white/40 uppercase tracking-wider">Nome do Plano</Label>
              <Input
                value={form.name}
                onChange={e => field("name", e.target.value)}
                className="h-8 text-sm bg-white/[0.04] border-white/[0.08] text-white focus:border-blue-500/50"
                data-testid="input-plan-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-white/40 uppercase tracking-wider">Cor</Label>
              <div className="flex items-center gap-2 h-8">
                <input
                  type="color"
                  value={form.color}
                  onChange={e => field("color", e.target.value)}
                  className="h-8 w-10 rounded cursor-pointer border border-white/10 bg-transparent"
                  data-testid="input-plan-color"
                />
                <span className="text-[11px] text-white/30 font-mono">{form.color}</span>
              </div>
            </div>
          </div>

          {/* Preços */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-white/40 uppercase tracking-wider">Preço Mensal (R$)</Label>
              <Input
                type="number"
                value={form.price_monthly}
                onChange={e => field("price_monthly", Number(e.target.value))}
                className="h-8 text-sm bg-white/[0.04] border-white/[0.08] text-white focus:border-blue-500/50"
                data-testid="input-plan-price-monthly"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-white/40 uppercase tracking-wider">Preço Anual (R$)</Label>
              <Input
                type="number"
                value={form.price_annual}
                onChange={e => field("price_annual", Number(e.target.value))}
                className="h-8 text-sm bg-white/[0.04] border-white/[0.08] text-white focus:border-blue-500/50"
                data-testid="input-plan-price-annual"
              />
            </div>
          </div>

          {/* Limites */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-white/40 uppercase tracking-wider">Máx. Usuários</Label>
              <Input
                type="number"
                value={form.max_users}
                onChange={e => field("max_users", Number(e.target.value))}
                className="h-8 text-sm bg-white/[0.04] border-white/[0.08] text-white focus:border-blue-500/50"
                data-testid="input-plan-max-users"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-white/40 uppercase tracking-wider">Máx. Artistas</Label>
              <Input
                type="number"
                value={form.max_artists}
                onChange={e => field("max_artists", Number(e.target.value))}
                className="h-8 text-sm bg-white/[0.04] border-white/[0.08] text-white focus:border-blue-500/50"
                data-testid="input-plan-max-artists"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-white/40 uppercase tracking-wider">Storage (GB)</Label>
              <Input
                type="number"
                value={form.max_storage_gb}
                onChange={e => field("max_storage_gb", Number(e.target.value))}
                className="h-8 text-sm bg-white/[0.04] border-white/[0.08] text-white focus:border-blue-500/50"
                data-testid="input-plan-storage"
              />
            </div>
          </div>

          {/* Features */}
          <div className="space-y-2">
            <Label className="text-[11px] text-white/40 uppercase tracking-wider">Funcionalidades</Label>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {form.features.map((f, idx) => (
                <div key={idx} className="flex items-center gap-2 group/feat">
                  <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: form.color }} />
                  <span className="flex-1 text-[12px] text-white/60">{f}</span>
                  <button
                    onClick={() => removeFeature(idx)}
                    className="opacity-0 group-hover/feat:opacity-100 transition-opacity p-0.5 rounded hover:bg-red-500/20 text-red-400"
                    data-testid={`remove-feature-${idx}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <Input
                placeholder="Nova funcionalidade..."
                value={newFeature}
                onChange={e => setNewFeature(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addFeature()}
                className="h-7 text-xs bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 focus:border-blue-500/50"
                data-testid="input-new-feature"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 border-white/10 text-white/50 hover:text-white"
                onClick={addFeature}
                data-testid="btn-add-feature"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="border-white/10 text-white/50 hover:text-white text-xs"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs gap-1.5"
            onClick={() => onSave(form)}
            data-testid="btn-save-plan"
          >
            <Save className="h-3.5 w-3.5" />
            Salvar alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Main page ── */
export default function AdminPlans() {
  const [plans, setPlans] = useState<AdminPlan[]>(MOCK_PLANS);
  const [editing, setEditing] = useState<AdminPlan | null>(null);

  function handleSave(updated: AdminPlan) {
    setPlans(prev => prev.map(p => p.id === updated.id ? updated : p));
    setEditing(null);
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-bold text-white">Planos</h1>
          <p className="text-[12.5px] text-white/40 mt-0.5">Gerenciamento de planos e preços</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="rounded-2xl border border-white/[0.07] bg-[hsl(222_47%_6%)] p-5 space-y-4 group/card relative"
              data-testid={`plan-${plan.id}`}
            >
              {/* Edit button */}
              <button
                onClick={() => setEditing(plan)}
                className="absolute top-4 right-4 p-1.5 rounded-lg opacity-0 group-hover/card:opacity-100 transition-opacity hover:bg-white/10 text-white/30 hover:text-white"
                data-testid={`edit-plan-${plan.id}`}
                title="Editar plano"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>

              <div className="flex items-center gap-2 pr-8">
                <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: plan.color }} />
                <span className="text-[14px] font-bold text-white">{plan.name}</span>
                <Badge variant="outline" className="ml-auto text-[10px] border-white/10 text-white/40">
                  {plan.active_subscribers} clientes
                </Badge>
              </div>

              <div>
                <p className="text-2xl font-bold text-white">
                  {fmtBRL(plan.price_monthly)}
                  <span className="text-[12px] font-normal text-white/30">/mês</span>
                </p>
                <p className="text-[11px] text-white/30 mt-0.5">
                  ou {fmtBRL(plan.price_annual)}/ano
                </p>
              </div>

              <div className="space-y-2 border-t border-white/[0.06] pt-3">
                {[
                  { icon: Users,      label: `${plan.max_users === 999 ? "Ilimitado" : plan.max_users} usuários` },
                  { icon: Tag,        label: `${plan.max_artists === 999 ? "Ilimitados" : plan.max_artists} artistas` },
                  { icon: HardDrive,  label: `${plan.max_storage_gb === 1000 ? "1 TB" : `${plan.max_storage_gb} GB`} storage` },
                  { icon: DollarSign, label: `MRR: ${fmtBRL(plan.mrr)}` },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2">
                    <Icon className="h-3 w-3 text-white/20 shrink-0" />
                    <span className="text-[11.5px] text-white/50">{label}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5 border-t border-white/[0.06] pt-3">
                {plan.features.map((f) => (
                  <div key={f} className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: plan.color }} />
                    <span className="text-[11.5px] text-white/50">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {editing && (
        <EditPlanDialog
          plan={editing}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
    </AdminLayout>
  );
}
