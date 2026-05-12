/**
 * modules/contracts-v2/pages/NewDocument.tsx
 *
 * Página de criação de documento — envolve DocumentWizard.
 * Rotas: /contratos/assinatura/novo (unificado) + /contratos-v2/novo (legacy redirect)
 *
 * Query params aceites (opcionais, pré-preenchem o wizard):
 *   contract_id — ID do contrato v1 a vincular
 *   titulo      — título inicial do documento
 *   artista_id  — ID do artista
 */

import { useNavigate, useSearchParams } from "react-router-dom";
import { MainLayout } from "@/shared/components/MainLayout";
import { DocumentWizard } from "../components/wizard/DocumentWizard";

export default function NewDocument() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const contractId = searchParams.get("contract_id") ?? undefined;
  const titulo     = searchParams.get("titulo") ?? undefined;
  const artistaId  = searchParams.get("artista_id") ?? undefined;

  return (
    <MainLayout
      title="Novo Documento para Assinatura"
      description="Crie um contrato com assinatura digital em 7 passos"
    >
      <div className="max-w-2xl mx-auto">
        <DocumentWizard
          initialContractId={contractId}
          initialTitulo={titulo}
          initialArtistaId={artistaId}
          onComplete={() => {
            navigate("/contratos");
          }}
        />
      </div>
    </MainLayout>
  );
}
