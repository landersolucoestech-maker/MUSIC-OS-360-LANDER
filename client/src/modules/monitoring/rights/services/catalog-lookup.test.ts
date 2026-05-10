import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildIsrcIndex,
  computeEcadMatchRate,
  findOrphanIsrcs,
  getCatalogObras,
  getIsrcIndex,
  type CatalogObra,
} from "./catalog-lookup";

const makeObra = (overrides: Partial<CatalogObra> = {}): CatalogObra => ({
  id: "obra-test-1",
  titulo: "Test Song",
  compositor: "Test Composer",
  compositores: "Test Composer",
  co_compositores: null,
  detentores: "Test Publisher",
  editora: "Test Publisher",
  isrc: "BRTEST000001",
  iswc: "T-000.000.001-0",
  cod_abramus: "ABR-TEST-001",
  cod_ecad: "ECAD-TEST-001",
  genero: "Pop",
  status: "registrado",
  duracao: "3:30",
  ...overrides,
});

vi.mock("@/shared/data/mockData", () => ({
  MOCK_DATA: {
    obras: [
      {
        id: "obra-001",
        titulo: "Noite de Luz",
        compositor: "Vitória Carvalho",
        compositores: "Vitória Carvalho, Lucas Mendes",
        co_compositores: "Lucas Mendes",
        detentores: "MusicOS Publishing",
        editora: "MusicOS Publishing",
        isrc: "BRMSC2500001",
        iswc: "T-123.456.789-0",
        cod_abramus: "ABR-001-2025",
        cod_ecad: "ECAD-0001-VL",
        genero: "Pop",
        status: "registrado",
        duracao: "3:42",
      },
      {
        id: "obra-002",
        titulo: "Beira do Rio",
        compositor: "Grupo Raiz Nordestina",
        compositores: "Grupo Raiz Nordestina",
        co_compositores: null,
        detentores: "MusicOS Publishing",
        editora: "MusicOS Publishing",
        isrc: "BRMSC2500002",
        iswc: "T-234.567.890-1",
        cod_abramus: "ABR-002-2025",
        cod_ecad: "ECAD-0002-RN",
        genero: "Forró",
        status: "registrado",
        duracao: "4:15",
      },
      {
        id: "obra-003",
        titulo: "No ECAD Code",
        compositor: "Unknown",
        compositores: "Unknown",
        co_compositores: null,
        detentores: "Unknown",
        editora: "Unknown",
        isrc: "BRMSC2500016",
        iswc: null,
        cod_abramus: null,
        cod_ecad: null,
        genero: "Funk",
        status: "pendente",
        duracao: "3:10",
      },
    ],
  },
}));

describe("buildIsrcIndex", () => {
  it("builds a Map indexed by ISRC", () => {
    const obras = [
      makeObra({ isrc: "BRMSC2500001", titulo: "Song A" }),
      makeObra({ id: "obra-2", isrc: "BRMSC2500002", titulo: "Song B" }),
    ];
    const index = buildIsrcIndex(obras);
    expect(index.size).toBe(2);
    expect(index.get("BRMSC2500001")?.titulo).toBe("Song A");
    expect(index.get("BRMSC2500002")?.titulo).toBe("Song B");
  });

  it("returns an empty Map for empty obra list", () => {
    const index = buildIsrcIndex([]);
    expect(index.size).toBe(0);
  });

  it("skips obras with empty/falsy ISRC", () => {
    const obras = [
      makeObra({ isrc: "" }),
      makeObra({ isrc: "BRMSC2500001" }),
    ];
    const index = buildIsrcIndex(obras);
    expect(index.size).toBe(1);
    expect(index.has("")).toBe(false);
    expect(index.has("BRMSC2500001")).toBe(true);
  });

  it("last obra wins when duplicate ISRCs exist", () => {
    const obras = [
      makeObra({ isrc: "BRMSC2500001", titulo: "First" }),
      makeObra({ id: "obra-dup", isrc: "BRMSC2500001", titulo: "Second" }),
    ];
    const index = buildIsrcIndex(obras);
    expect(index.size).toBe(1);
    expect(index.get("BRMSC2500001")?.titulo).toBe("Second");
  });
});

describe("computeEcadMatchRate", () => {
  it("returns 0 when isrcs list is empty", () => {
    const index = new Map();
    expect(computeEcadMatchRate([], index)).toBe(0);
  });

  it("returns 100 when all ISRCs have a catalog obra with cod_ecad", () => {
    const obras = [
      makeObra({ isrc: "ISRC-A", cod_ecad: "ECAD-001" }),
      makeObra({ id: "obra-b", isrc: "ISRC-B", cod_ecad: "ECAD-002" }),
    ];
    const index = buildIsrcIndex(obras);
    expect(computeEcadMatchRate(["ISRC-A", "ISRC-B"], index)).toBe(100);
  });

  it("returns 0 when no ISRCs are in the catalog", () => {
    const index = new Map();
    expect(computeEcadMatchRate(["ORPHAN-001", "ORPHAN-002"], index)).toBe(0);
  });

  it("returns 0 when obra exists but cod_ecad is null", () => {
    const obra = makeObra({ isrc: "ISRC-A", cod_ecad: null });
    const index = buildIsrcIndex([obra]);
    expect(computeEcadMatchRate(["ISRC-A"], index)).toBe(0);
  });

  it("computes partial match rate (rounded)", () => {
    const obras = [
      makeObra({ isrc: "ISRC-A", cod_ecad: "ECAD-001" }),
      makeObra({ id: "obra-b", isrc: "ISRC-B", cod_ecad: null }),
      makeObra({ id: "obra-c", isrc: "ISRC-C", cod_ecad: "ECAD-003" }),
    ];
    const index = buildIsrcIndex(obras);
    const rate = computeEcadMatchRate(["ISRC-A", "ISRC-B", "ISRC-C"], index);
    expect(rate).toBe(67);
  });

  it("treats ISRCs missing from catalog as unmatched", () => {
    const obra = makeObra({ isrc: "ISRC-A", cod_ecad: "ECAD-001" });
    const index = buildIsrcIndex([obra]);
    const rate = computeEcadMatchRate(["ISRC-A", "ORPHAN-001"], index);
    expect(rate).toBe(50);
  });

  it("rounds result (e.g. 1/3 → 33)", () => {
    const obras = [
      makeObra({ isrc: "ISRC-A", cod_ecad: "ECAD-001" }),
      makeObra({ id: "obra-b", isrc: "ISRC-B", cod_ecad: null }),
      makeObra({ id: "obra-c", isrc: "ISRC-C", cod_ecad: null }),
    ];
    const index = buildIsrcIndex(obras);
    expect(computeEcadMatchRate(["ISRC-A", "ISRC-B", "ISRC-C"], index)).toBe(33);
  });
});

describe("findOrphanIsrcs", () => {
  it("returns empty array when all ISRCs are in the catalog", () => {
    const obras = [makeObra({ isrc: "ISRC-A" }), makeObra({ id: "b", isrc: "ISRC-B" })];
    const index = buildIsrcIndex(obras);
    expect(findOrphanIsrcs(["ISRC-A", "ISRC-B"], index)).toEqual([]);
  });

  it("returns all ISRCs when none are in the catalog", () => {
    const index = new Map();
    const orphans = findOrphanIsrcs(["ORPHAN-A", "ORPHAN-B"], index);
    expect(orphans).toEqual(["ORPHAN-A", "ORPHAN-B"]);
  });

  it("returns only orphan ISRCs when catalog is partial", () => {
    const obra = makeObra({ isrc: "ISRC-A" });
    const index = buildIsrcIndex([obra]);
    const orphans = findOrphanIsrcs(["ISRC-A", "ORPHAN-B", "ORPHAN-C"], index);
    expect(orphans).toEqual(["ORPHAN-B", "ORPHAN-C"]);
  });

  it("returns empty array for empty ISRC list", () => {
    const index = new Map();
    expect(findOrphanIsrcs([], index)).toEqual([]);
  });
});

describe("getCatalogObras (via mock)", () => {
  it("returns obras from MOCK_DATA", () => {
    const obras = getCatalogObras();
    expect(Array.isArray(obras)).toBe(true);
    expect(obras.length).toBeGreaterThan(0);
    expect(obras[0]).toHaveProperty("isrc");
    expect(obras[0]).toHaveProperty("cod_ecad");
  });
});

describe("getIsrcIndex (integration)", () => {
  it("returns a non-empty Map indexed by ISRC using mocked MOCK_DATA", () => {
    const index = getIsrcIndex();
    expect(index instanceof Map).toBe(true);
    expect(index.size).toBeGreaterThan(0);
    expect(index.has("BRMSC2500001")).toBe(true);
    expect(index.get("BRMSC2500001")?.titulo).toBe("Noite de Luz");
  });

  it("includes obras with and without cod_ecad", () => {
    const index = getIsrcIndex();
    const withEcad = index.get("BRMSC2500001");
    const withoutEcad = index.get("BRMSC2500016");
    expect(withEcad?.cod_ecad).toBe("ECAD-0001-VL");
    expect(withoutEcad?.cod_ecad).toBeNull();
  });
});
