import { WorkRegistryValidationService, RecordingRegistryValidationService } from './entity-validators';
import type { WorkEntity, PhonogramEntity, ShareEntity } from '../../../database/entities';

const work = new WorkRegistryValidationService();
const recording = new RecordingRegistryValidationService();

const asWork = (o: Partial<WorkEntity>): WorkEntity => o as unknown as WorkEntity;
const asRec = (o: Partial<PhonogramEntity>): PhonogramEntity => o as unknown as PhonogramEntity;
const share = (o: Partial<ShareEntity>): ShareEntity => o as unknown as ShareEntity;
const codes = (issues: { code: string }[]) => issues.map((i) => i.code);
const errors = (issues: { severity: string }[]) => issues.filter((i) => i.severity === 'ERROR');

describe('WorkRegistryValidationService', () => {
  it('passes a valid work (title + one author at 100%)', () => {
    const issues = work.validate(
      asWork({ titulo: 'Minha Obra', ai_used: false }),
      [share({ percentual: '100', papel: 'autor', titular_nome: 'A', deleted_at: null })],
    );
    expect(errors(issues)).toHaveLength(0);
  });

  it('flags a work without any author', () => {
    const issues = work.validate(asWork({ titulo: 'X', ai_used: false }), []);
    expect(codes(issues)).toContain('work_no_author');
  });

  it('flags splits that do not sum to 100%', () => {
    const issues = work.validate(
      asWork({ titulo: 'X', ai_used: false }),
      [share({ percentual: '60', papel: 'autor', titular_nome: 'A', deleted_at: null })],
    );
    expect(codes(issues)).toContain('work_split_not_100');
  });

  it('requires AI tools/prompts when ai_used is true', () => {
    const issues = work.validate(
      asWork({ titulo: 'X', ai_used: true, ai_tools: [], ai_prompts: [] }),
      [share({ percentual: '100', papel: 'autor', titular_nome: 'A', deleted_at: null })],
    );
    expect(codes(issues)).toContain('work_ai_declaration_missing');
  });
});

describe('RecordingRegistryValidationService', () => {
  const valid = (): Partial<PhonogramEntity> => ({
    titulo: 'Faixa',
    obra_id: 'w1',
    duration_seconds: 180,
    artista_id: 'a1',
    phonographic_producer_id: 'p1',
    isrc: 'BRABC2600001',
  });

  it('passes a valid recording', () => {
    expect(errors(recording.validate(asRec(valid()), []))).toHaveLength(0);
  });

  it('requires a linked work', () => {
    expect(codes(recording.validate(asRec({ ...valid(), obra_id: null }), []))).toContain('recording_work_required');
  });

  it('requires a phonographic producer', () => {
    const issues = recording.validate(asRec({ ...valid(), phonographic_producer_id: null, produtores: null }), []);
    expect(codes(issues)).toContain('recording_producer_required');
  });

  it('rejects an invalid ISRC', () => {
    expect(codes(recording.validate(asRec({ ...valid(), isrc: 'NOPE' }), []))).toContain('recording_isrc_invalid');
  });
});
