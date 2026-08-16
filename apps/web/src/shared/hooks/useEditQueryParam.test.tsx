import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { useEditQueryParam } from "@/shared/hooks/useEditQueryParam";
import { storage } from "@/shared/lib/storage";

vi.mock("@/shared/lib/storage", async () => {
  const actual = await vi.importActual<typeof import("@/shared/lib/storage")>("@/shared/lib/storage");
  return { ...actual, storage: { ...actual.storage, findById: vi.fn() } };
});

const mockedFindById = vi.mocked(storage.findById);

interface FakeRow { id: string; nome: string }

function wrapperFor(initialEntry: string) {
  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
  );
}

describe("useEditQueryParam", () => {
  beforeEach(() => {
    mockedFindById.mockReset();
  });

  it("resolve pelo id quando o registro já está na lista carregada (comportamento original preservado)", async () => {
    const items: FakeRow[] = [{ id: "id-1", nome: "Um" }, { id: "id-2", nome: "Dois" }];
    const onMatch = vi.fn();
    renderHook(() => useEditQueryParam("edit", items, onMatch, "artistas"), {
      wrapper: wrapperFor("/artistas?edit=id-2"),
    });

    await waitFor(() => expect(onMatch).toHaveBeenCalledWith(items[1]));
    expect(mockedFindById).not.toHaveBeenCalled();
  });

  it("registro #75 fora da lista carregada (capada em 50) resolve via busca direta por ID quando `table` é passado", async () => {
    // Simula a lista "me dê tudo" travada nos primeiros 50 registros do tenant.
    const items: FakeRow[] = Array.from({ length: 50 }, (_, i) => ({ id: `id-${i + 1}`, nome: `Registro ${i + 1}` }));
    mockedFindById.mockResolvedValue({ id: "id-75", nome: "Registro 75" });
    const onMatch = vi.fn();

    renderHook(() => useEditQueryParam("edit", items, onMatch, "artistas"), {
      wrapper: wrapperFor("/artistas?edit=id-75"),
    });

    await waitFor(() => expect(onMatch).toHaveBeenCalledWith({ id: "id-75", nome: "Registro 75" }));
    expect(mockedFindById).toHaveBeenCalledWith("artistas", "id-75");
  });

  it("sem `table`, mantém o comportamento antigo: não resolve registros fora da lista carregada", async () => {
    const items: FakeRow[] = Array.from({ length: 50 }, (_, i) => ({ id: `id-${i + 1}`, nome: `Registro ${i + 1}` }));
    const onMatch = vi.fn();

    renderHook(() => useEditQueryParam("edit", items, onMatch), {
      wrapper: wrapperFor("/artistas?edit=id-75"),
    });

    await new Promise((r) => setTimeout(r, 0));
    expect(onMatch).not.toHaveBeenCalled();
    expect(mockedFindById).not.toHaveBeenCalled();
  });

  it("sem parâmetro na URL, não busca nada", async () => {
    const onMatch = vi.fn();
    renderHook(() => useEditQueryParam("edit", [], onMatch, "artistas"), {
      wrapper: wrapperFor("/artistas"),
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(onMatch).not.toHaveBeenCalled();
    expect(mockedFindById).not.toHaveBeenCalled();
  });
});
