import { extractAppleMusicId } from './apple-music-url.util';

describe('extractAppleMusicId', () => {
  // Regressão do bug reportado "Link do Apple Music inválido" para uma URL
  // corretamente cadastrada: o normalizador do frontend sempre produz a URL
  // SEM o segmento de locale, mas este extractor (antes do fix) exigia o
  // locale como obrigatório — a própria saída normalizada do frontend nunca
  // conseguia passar na validação do backend. Este caso tem que aceitar.
  it('aceita URL sem locale (regressão do bug reportado)', () => {
    expect(extractAppleMusicId('https://music.apple.com/artist/1543163588')).toBe('1543163588');
  });

  it('aceita URL com locale', () => {
    expect(extractAppleMusicId('https://music.apple.com/us/artist/1543163588')).toBe('1543163588');
  });

  it('aceita URL com slug e locale', () => {
    expect(extractAppleMusicId('https://music.apple.com/us/artist/dj-stay/1543163588')).toBe('1543163588');
  });

  it('aceita URL com slug sem locale', () => {
    expect(extractAppleMusicId('https://music.apple.com/artist/dj-stay/1543163588')).toBe('1543163588');
  });

  it('aceita URL com query string', () => {
    expect(extractAppleMusicId('https://music.apple.com/us/artist/1543163588?ls=1')).toBe('1543163588');
  });

  it('aceita id numérico puro (sem URL)', () => {
    expect(extractAppleMusicId('1543163588')).toBe('1543163588');
  });

  it('rejeita URL inválida', () => {
    expect(extractAppleMusicId('not a url')).toBeNull();
  });

  it('rejeita domínio falso', () => {
    expect(extractAppleMusicId('https://fake-apple.com/us/artist/1543163588')).toBeNull();
  });

  it('rejeita quando o id está ausente', () => {
    expect(extractAppleMusicId('https://music.apple.com/us/artist/')).toBeNull();
  });

  it('rejeita id não numérico', () => {
    expect(extractAppleMusicId('https://music.apple.com/us/artist/abc')).toBeNull();
  });

  it('rejeita string em branco', () => {
    expect(extractAppleMusicId('   ')).toBeNull();
  });

  it('rejeita string vazia', () => {
    expect(extractAppleMusicId('')).toBeNull();
  });

  it('rejeita URL arbitrária contendo apenas dígitos fora do domínio Apple Music', () => {
    expect(extractAppleMusicId('https://example.com/1543163588')).toBeNull();
  });
});
