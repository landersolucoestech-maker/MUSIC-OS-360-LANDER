import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useProjetos } from "./useProjetos";
import { storage } from "@/shared/lib/storage";

vi.mock("@/shared/lib/storage", async () => {
  const actual = await vi.importActual<typeof import("@/shared/lib/storage")>("@/shared/lib/storage");
  return { ...actual, storage: { ...actual.storage, list: vi.fn() } };
});

const mockedList = vi.mocked(storage.list);

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

// Regressão: QueryProjectDto (apps/api) só aceita a query param "artistId"
// (Task H alinhou DTO/service nesse nome). Enviar "artista_id" — como o hook
// fazia antes — é rejeitado com 400 pelo whitelist do ValidationPipe, o que
// quebrava silenciosamente a aba Projetos do modal Visão 360° do artista.
describe("useProjetos", () => {
  beforeEach(() => {
    mockedList.mockReset();
    mockedList.mockResolvedValue([]);
  });

  it("filtra por artistId (não artista_id) ao buscar projetos de um artista", async () => {
    renderHook(() => useProjetos(true, "artist-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(mockedList).toHaveBeenCalled());
    const [, options] = mockedList.mock.calls[0]!;
    expect(options?.filters).toEqual({ artistId: "artist-1" });
    expect(options?.filters).not.toHaveProperty("artista_id");
  });

  it("sem artistaId, não aplica filtro de artista", async () => {
    renderHook(() => useProjetos(true), { wrapper: createWrapper() });

    await waitFor(() => expect(mockedList).toHaveBeenCalled());
    const [, options] = mockedList.mock.calls[0]!;
    expect(options?.filters).toBeUndefined();
  });
});
