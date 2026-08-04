import { fetchProjectsMusicasForExport, insertProjectsMusicasForImport } from './projects-musicas.field';

describe('projects-musicas.field — resolver do campo computed de Projetos', () => {
  describe('fetchProjectsMusicasForExport', () => {
    it('lista vazia de projectIds → não consulta o banco, retorna mapa vazio', async () => {
      const query = jest.fn();
      const ds = { query } as any;
      const result = await fetchProjectsMusicasForExport(ds, 'tenant-1', []);
      expect(query).not.toHaveBeenCalled();
      expect(result.size).toBe(0);
    });

    it('agrupa faixas por projeto e participantes por papel, isolado por tenant_id', async () => {
      const tracks = [
        {
          id: 'track-1', project_id: 'proj-1', nome: 'Faixa 1', solo_feat: 'solo',
          original_remix: 'original', instrumental: 'nao', duracao_min: '3', duracao_seg: '30',
          genero: 'pop', idioma: 'portugues', letra: 'la la', audio_url: 'https://x/a.mp3',
        },
      ];
      const participants = [
        { project_track_id: 'track-1', nome: 'Fulano', role: 'compositor' },
        { project_track_id: 'track-1', nome: 'Ciclano', role: 'interprete' },
        { project_track_id: 'track-1', nome: 'Beltrano', role: 'produtor' },
      ];
      const query = jest.fn()
        .mockResolvedValueOnce(tracks)
        .mockResolvedValueOnce(participants);
      const ds = { query } as any;

      const result = await fetchProjectsMusicasForExport(ds, 'tenant-1', ['proj-1']);

      expect(query.mock.calls[0][0]).toContain('"project_tracks"');
      expect(query.mock.calls[0][1]).toEqual(['tenant-1', ['proj-1']]);
      expect(query.mock.calls[1][0]).toContain('"project_track_participants"');
      expect(query.mock.calls[1][1]).toEqual(['tenant-1', ['track-1']]);

      const musicas = result.get('proj-1');
      expect(musicas).toHaveLength(1);
      expect(musicas![0]).toEqual({
        nome: 'Faixa 1', soloFeat: 'solo', originalRemix: 'original', instrumental: 'nao',
        duracaoMin: '3', duracaoSeg: '30', genero: 'pop', idioma: 'portugues', letra: 'la la',
        audioUrl: 'https://x/a.mp3', compositores: ['Fulano'], interpretes: ['Ciclano'], produtores: ['Beltrano'],
      });
    });

    it('projeto sem faixas → não aparece no mapa (export serializa como [])', async () => {
      const query = jest.fn().mockResolvedValueOnce([]);
      const ds = { query } as any;
      const result = await fetchProjectsMusicasForExport(ds, 'tenant-1', ['proj-vazio']);
      expect(result.has('proj-vazio')).toBe(false);
      // segunda query (participants) não deve rodar quando não há faixas
      expect(query).toHaveBeenCalledTimes(1);
    });
  });

  describe('insertProjectsMusicasForImport', () => {
    function makeQR() {
      const calls: Array<[string, unknown[]]> = [];
      const qr = { query: jest.fn((sql: string, params: unknown[]) => { calls.push([sql, params]); return Promise.resolve([]); }) } as any;
      return { qr, calls };
    }

    it('valor não-array → no-op (nenhuma query)', async () => {
      const { qr, calls } = makeQR();
      await insertProjectsMusicasForImport(qr, 'tenant-1', 'proj-1', 'não é array');
      expect(calls).toHaveLength(0);
    });

    it('insere uma project_track por música + participantes por papel, tenant forçado', async () => {
      const { qr, calls } = makeQR();
      const musicas = [
        {
          nome: 'Faixa importada', soloFeat: 'feat', originalRemix: 'remix', instrumental: 'sim',
          duracaoMin: '4', duracaoSeg: '12', genero: 'rock', idioma: 'ingles', letra: '',
          audioUrl: '', compositores: ['A', ''], interpretes: ['B'], produtores: [],
        },
      ];
      await insertProjectsMusicasForImport(qr, 'tenant-1', 'proj-novo', musicas);

      const trackInsert = calls.find(([sql]) => sql.includes('"project_tracks"'));
      expect(trackInsert).toBeDefined();
      expect(trackInsert![1]).toEqual(
        expect.arrayContaining(['tenant-1', 'proj-novo', 'Faixa importada', 'feat', 'remix', 'sim', '4', '12', 'rock', 'ingles']),
      );

      const participantInserts = calls.filter(([sql]) => sql.includes('"project_track_participants"'));
      // "A" (compositor) + "" (filtrado) + "B" (interprete) = 2 inserts; produtores vazio = 0
      expect(participantInserts).toHaveLength(2);
      expect(participantInserts.map(([, params]) => params[3])).toEqual(['A', 'B']);
      expect(participantInserts.map(([, params]) => params[4])).toEqual(['compositor', 'interprete']);
      // tenant sempre o do commit (nunca do arquivo)
      for (const [, params] of participantInserts) expect(params[1]).toBe('tenant-1');
    });

    it('item não-objeto dentro do array é ignorado sem lançar', async () => {
      const { qr, calls } = makeQR();
      await insertProjectsMusicasForImport(qr, 'tenant-1', 'proj-1', [null, 'string', 42, { nome: 'Válida' }]);
      const trackInserts = calls.filter(([sql]) => sql.includes('"project_tracks"'));
      expect(trackInserts).toHaveLength(1);
    });
  });
});
