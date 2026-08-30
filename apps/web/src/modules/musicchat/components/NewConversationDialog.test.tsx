import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const serviceMock = vi.hoisted(() => ({ create: vi.fn(), sendMessage: vi.fn() }));

vi.mock("@/modules/musicchat/services/conversations.service", () => ({
  musicChatConversationsService: serviceMock,
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { NewConversationDialog } from "./NewConversationDialog";

/**
 * PD-1/PD-3 (2026-08-23): a chave de idempotência precisa ser estável POR TENTATIVA LÓGICA.
 * Se cada chamada gerasse um UUID novo, um retry do agente após falha de rede criaria uma
 * SEGUNDA conversa — exatamente o caso que a chave existe para impedir. Este teste falha
 * contra a implementação antiga (crypto.randomUUID() dentro do service a cada chamada).
 */
describe("NewConversationDialog — idempotency key stability", () => {
  beforeEach(() => vi.clearAllMocks());

  const conversation = { id: "conv-1" } as never;

  const fillAndSubmit = (phone = "+5511999999999") => {
    fireEvent.change(screen.getByLabelText("Telefone (WhatsApp)"), { target: { value: phone } });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar conversa" }));
  };

  it("reuses the same key when the agent retries after a failed attempt", async () => {
    serviceMock.create.mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce(conversation);

    render(<NewConversationDialog open onOpenChange={() => {}} onCreated={() => {}} />);

    fillAndSubmit();
    await waitFor(() => expect(serviceMock.create).toHaveBeenCalledTimes(1));

    fillAndSubmit();
    await waitFor(() => expect(serviceMock.create).toHaveBeenCalledTimes(2));

    const [, firstKey] = serviceMock.create.mock.calls[0];
    const [, secondKey] = serviceMock.create.mock.calls[1];
    expect(firstKey).toMatch(/^[0-9a-f-]{36}$/);
    expect(secondKey).toBe(firstKey);
  });

  it("mints a NEW key when the agent edits the payload before retrying (an edit is a different attempt)", async () => {
    serviceMock.create.mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce(conversation);

    render(<NewConversationDialog open onOpenChange={() => {}} onCreated={() => {}} />);

    fillAndSubmit("+5511999999999");
    await waitFor(() => expect(serviceMock.create).toHaveBeenCalledTimes(1));

    // Número corrigido: reusar a chave faria o backend replayar a resposta antiga e a correção
    // seria silenciosamente descartada.
    fillAndSubmit("+5511888888888");
    await waitFor(() => expect(serviceMock.create).toHaveBeenCalledTimes(2));

    expect(serviceMock.create.mock.calls[1][1]).not.toBe(serviceMock.create.mock.calls[0][1]);
  });

  it("creates the conversation on the whatsapp channel with the phone in metadata", async () => {
    serviceMock.create.mockResolvedValue(conversation);

    render(<NewConversationDialog open onOpenChange={() => {}} onCreated={() => {}} />);
    fillAndSubmit();

    await waitFor(() => expect(serviceMock.create).toHaveBeenCalled());
    expect(serviceMock.create.mock.calls[0][0]).toEqual(
      expect.objectContaining({ channel: "whatsapp", phone: "+5511999999999" }),
    );
  });

  it("does not send an initial message when the field is left empty", async () => {
    serviceMock.create.mockResolvedValue(conversation);

    render(<NewConversationDialog open onOpenChange={() => {}} onCreated={() => {}} />);
    fillAndSubmit();

    await waitFor(() => expect(serviceMock.create).toHaveBeenCalled());
    expect(serviceMock.sendMessage).not.toHaveBeenCalled();
  });
});
