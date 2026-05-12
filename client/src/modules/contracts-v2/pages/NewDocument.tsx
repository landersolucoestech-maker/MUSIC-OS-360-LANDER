/**
 * modules/contracts-v2/pages/NewDocument.tsx
 *
 * Página de criação de documento — envolve DocumentWizard.
 * Rota: /contratos-v2/novo
 */

import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/shared/components/MainLayout";
import { DocumentWizard } from "../components/wizard/DocumentWizard";

export default function NewDocument() {
  const navigate = useNavigate();

  return (
    <MainLayout
      title="Novo Documento"
      description="Crie um contrato com assinatura digital em 7 passos"
    >
      <div className="max-w-2xl mx-auto">
        <DocumentWizard
          onComplete={(docId) => {
            void docId;
            navigate("/contratos-v2");
          }}
        />
      </div>
    </MainLayout>
  );
}
