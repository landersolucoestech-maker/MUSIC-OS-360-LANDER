import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/ui/form";
import { Loader2, CheckCircle, AlertCircle, Music } from "lucide-react";
import { SERVICOS_INTERESSE_OPTIONS } from "../hooks/useLeads";
import { captureLeadUseCase } from "../application/captureLead.usecase";

const leadCaptureSchema = z.object({
  nome: z.string().min(2, "Nome deve ter no mínimo 2 caracteres").max(100, "Nome muito longo"),
  email: z.string().email("Email inválido").max(255, "Email muito longo"),
  telefone: z.string().min(10, "Telefone deve ter no mínimo 10 dígitos").max(20, "Telefone muito longo"),
  servico: z.string().min(1, "Selecione um serviço de interesse"),
  mensagem: z.string().max(1000, "Mensagem muito longa").optional().or(z.literal("")),
});

type LeadCaptureFormData = z.infer<typeof leadCaptureSchema>;

type SubmitState = "idle" | "loading" | "success" | "error";

export default function LeadCapture() {
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const form = useForm<LeadCaptureFormData>({
    resolver: zodResolver(leadCaptureSchema),
    defaultValues: {
      nome: "",
      email: "",
      telefone: "",
      servico: "",
      mensagem: "",
    },
  });

  const handleSubmit = async (data: LeadCaptureFormData) => {
    setSubmitState("loading");
    setErrorMessage("");

    try {
      await captureLeadUseCase({
        nome: data.nome,
        email: data.email,
        telefone: data.telefone,
        servico: data.servico,
        mensagem: data.mensagem || undefined,
        origem: "website",
      });

      setSubmitState("success");
      form.reset();
    } catch (err: unknown) {
      setSubmitState("error");
      setErrorMessage(err instanceof Error ? err.message : "Erro inesperado. Tente novamente.");
    }
  };

  if (submitState === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-black p-4">
        <Card className="w-full max-w-md p-8 text-center bg-gray-900 border-gray-800">
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-full bg-success/20 p-4">
              <CheckCircle className="h-12 w-12 text-success" />
            </div>
            <h2 className="text-2xl font-bold text-white">Recebemos seu contato!</h2>
            <p className="text-gray-400">Nossa equipe entrará em contato em breve.</p>
            <Button
              variant="outline"
              className="mt-4 border-gray-700 text-gray-300 hover:bg-gray-800"
              onClick={() => setSubmitState("idle")}
            >
              Enviar outro
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-black p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="rounded-full bg-primary/20 p-3">
              <Music className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white">MUSIC OS 360</h1>
          <p className="text-gray-400 mt-2">Gestão completa para sua carreira musical</p>
        </div>

        <Card className="bg-gray-900 border-gray-800 p-6">
          <h2 className="text-xl font-semibold text-white mb-2">Entre em contato</h2>
          <p className="text-gray-400 text-sm mb-6">Preencha o formulário e nossa equipe entrará em contato.</p>

          {submitState === "error" && (
            <div className="flex items-center gap-2 bg-destructive/20 border border-destructive rounded-md p-3 mb-4">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-destructive text-sm">{errorMessage}</p>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">Nome completo *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Seu nome"
                        className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                        data-testid="input-nome"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Email *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="seu@email.com"
                          className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                          data-testid="input-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="telefone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Telefone *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="(00) 00000-0000"
                          className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                          data-testid="input-telefone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="servico"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">Serviço de interesse *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger
                          className="bg-gray-800 border-gray-700 text-white"
                          data-testid="select-servico"
                        >
                          <SelectValue placeholder="Selecione um serviço" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        {SERVICOS_INTERESSE_OPTIONS.map((opt) => (
                          <SelectItem
                            key={opt.value}
                            value={opt.value}
                            className="text-white hover:bg-gray-700"
                          >
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mensagem"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">Mensagem (opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Conte mais sobre seu projeto..."
                        className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 min-h-[80px]"
                        data-testid="textarea-mensagem"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={submitState === "loading"}
                data-testid="button-submit"
              >
                {submitState === "loading" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar mensagem"
                )}
              </Button>
            </form>
          </Form>
        </Card>
      </div>
    </div>
  );
}
