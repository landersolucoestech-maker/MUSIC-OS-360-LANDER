import { AdminLayout } from "../layouts/AdminLayout";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/utils";
import { MOCK_PLANS } from "../data/mockAdmin";
import { Tag, Users, HardDrive, DollarSign, Check } from "lucide-react";

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export default function AdminPlans() {
  return (
    <AdminLayout>
      <div className="p-6 space-y-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-bold text-white">Planos</h1>
          <p className="text-[12.5px] text-white/40 mt-0.5">Gerenciamento de planos e preços</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {MOCK_PLANS.map((plan) => (
            <div
              key={plan.id}
              className="rounded-2xl border border-white/[0.07] bg-[hsl(222_47%_6%)] p-5 space-y-4"
              data-testid={`plan-${plan.id}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ background: plan.color }} />
                  <span className="text-[14px] font-bold text-white">{plan.name}</span>
                </div>
                <Badge variant="outline" className="text-[10px] border-white/10 text-white/40">
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
                  { icon: Users,     label: `${plan.max_users === 999 ? "Ilimitado" : plan.max_users} usuários` },
                  { icon: Tag,       label: `${plan.max_artists === 999 ? "Ilimitados" : plan.max_artists} artistas` },
                  { icon: HardDrive, label: `${plan.max_storage_gb === 1000 ? "1 TB" : `${plan.max_storage_gb} GB`} storage` },
                  { icon: DollarSign,label: `MRR: ${fmtBRL(plan.mrr)}` },
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
    </AdminLayout>
  );
}
