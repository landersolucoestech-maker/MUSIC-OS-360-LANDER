/**
 * AudiovisualProjectFormModal.payload.test.ts
 *
 * Guarda permanente (auditoria 2026-07-18 — audiovisual CRÍTICO confirmado):
 * o formulário real de produção audiovisual enviava, sem nenhum mapper
 * intermediário, campos que CreateAudiovisualProjectDto não declarava
 * (format, videomaker, editor, location, capture_status, editing_status,
 * approval_status, pre_release_date, observations, concept, final_status,
 * music_title, artist_name) — com ValidationPipe (whitelist +
 * forbidNonWhitelisted), toda criação/edição de produção audiovisual
 * retornava 400. Este teste fixa o payload real e garante que os nomes
 * inventados (music_id, budget, real_cost, name) nunca voltem a ser enviados.
 */
import { describe, it, expect } from "vitest";
import { buildAudiovisualProjectPayload } from "./AudiovisualProjectFormModal";

const BASE_FORM = {
  music_id: "",
  music_title: "Minha Música",
  artist_name: "Artista X",
  type: "music_video" as const,
  format: "16:9",
  director: "Fulano",
  videomaker: "Beltrano",
  editor: "Ciclano",
  shooting_date: "2026-08-01",
  location: "Estúdio A",
  capture_status: "scheduled",
  editing_status: "not_started",
  approval_status: "pending",
  pre_release_date: "2026-08-10",
  release_date: "2026-08-15",
  budget: "1000",
  real_cost: "500",
  concept: "Conceito inicial",
  observations: "Nenhuma",
};

describe("buildAudiovisualProjectPayload — contrato canônico de audiovisual_projects", () => {
  it("nunca envia music_id/budget/real_cost/name — não são colunas reais", () => {
    const payload = buildAudiovisualProjectPayload(BASE_FORM, "create");
    expect(payload).not.toHaveProperty("music_id");
    expect(payload).not.toHaveProperty("budget");
    expect(payload).not.toHaveProperty("real_cost");
    expect(payload).not.toHaveProperty("name");
  });

  it("mapeia music_id selecionado para phonogram_id (mesma relação, nome real)", () => {
    const payload = buildAudiovisualProjectPayload({ ...BASE_FORM, music_id: "phono-1" }, "create");
    expect(payload.phonogram_id).toBe("phono-1");
  });

  it("omite phonogram_id quando nenhuma música foi selecionada (não envia string vazia)", () => {
    const payload = buildAudiovisualProjectPayload(BASE_FORM, "create");
    expect(payload.phonogram_id).toBeUndefined();
  });

  it("mapeia budget/real_cost para budget_estimated/budget_actual (mesma coluna somada pelo dashboard)", () => {
    const payload = buildAudiovisualProjectPayload(BASE_FORM, "create");
    expect(payload.budget_estimated).toBe("1000");
    expect(payload.budget_actual).toBe("500");
  });

  it("envia todos os campos do formulário real como colunas de topo", () => {
    const payload = buildAudiovisualProjectPayload(BASE_FORM, "create");
    expect(payload).toMatchObject({
      music_title: "Minha Música",
      artist_name: "Artista X",
      title: "Minha Música",
      format: "16:9",
      director: "Fulano",
      videomaker: "Beltrano",
      editor: "Ciclano",
      shooting_date: "2026-08-01",
      location: "Estúdio A",
      capture_status: "scheduled",
      editing_status: "not_started",
      approval_status: "pending",
      pre_release_date: "2026-08-10",
      release_date: "2026-08-15",
      concept: "Conceito inicial",
      observations: "Nenhuma",
    });
  });
});
