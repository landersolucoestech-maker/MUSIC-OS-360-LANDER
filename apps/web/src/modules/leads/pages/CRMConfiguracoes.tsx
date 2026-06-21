import { MainLayout } from "@/shared/components/MainLayout";
import {
  ModuleOperationalListsPanel,
  type ModuleListSection,
} from "@/modules/settings/components/ModuleOperationalListsPanel";

const CRM_SECTIONS: ModuleListSection[] = [
  {
    kind: "lead_category",
    title: "Categorias de leads",
    description: "Tipos comerciais usados no cadastro, filtros e segmentação dos leads.",
  },
  {
    kind: "lead_status",
    title: "Status de leads",
    description: "Etapas do funil comercial usadas nos formulários e filtros de CRM.",
  },
  {
    kind: "lead_segment",
    title: "Segmentos",
    description: "Agrupamentos comerciais para organização e leitura dos leads.",
  },
  {
    kind: "contact_category",
    title: "Categorias de contatos",
    description: "Categorias gerais usadas para classificar contatos do CRM.",
  },
  {
    kind: "contact_pf_classification",
    title: "Classificações PF",
    description: "Classificações específicas para contatos Pessoa Física.",
  },
  {
    kind: "contact_pj_classification",
    title: "Classificações PJ",
    description: "Classificações específicas para contatos Pessoa Jurídica.",
  },
];

export default function CRMConfiguracoes() {
  return (
    <MainLayout title="Configurações do CRM" description="Listas e classificações usadas em leads e contatos">
      <ModuleOperationalListsPanel sections={CRM_SECTIONS} />
    </MainLayout>
  );
}
