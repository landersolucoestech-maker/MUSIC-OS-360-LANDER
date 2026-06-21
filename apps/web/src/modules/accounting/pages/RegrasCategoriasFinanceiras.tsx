import { Link } from "react-router-dom";
import { ArrowRight, GitBranch, Tags } from "lucide-react";
import { MainLayout } from "@/shared/components/MainLayout";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

const AREAS = [
  {
    title: "Regras de categorização",
    description: "Configure regras automáticas usadas para classificar transações financeiras.",
    href: "/accounting/rules",
    icon: GitBranch,
  },
  {
    title: "Categorias financeiras",
    description: "Gerencie categorias, subcategorias e listas usadas nos formulários financeiros.",
    href: "/accounting/categorias",
    icon: Tags,
  },
];

export default function RegrasCategoriasFinanceiras() {
  return (
    <MainLayout title="Regras e Categorias" description="Configurações próprias do módulo Financeiro">
      <div className="grid gap-4 md:grid-cols-2">
        {AREAS.map((area) => {
          const Icon = area.icon;
          return (
            <Card key={area.href}>
              <CardHeader>
                <div className="mb-3 flex h-8 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle>{area.title}</CardTitle>
                <CardDescription>{area.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild size="sm" className="h-8 text-xs gap-1.5">
                  <Link to={area.href}>
                    Abrir configuração
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </MainLayout>
  );
}
