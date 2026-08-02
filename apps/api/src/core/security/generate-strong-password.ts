/**
 * generate-strong-password.ts  (Parte 73, charset revisto na Parte 75)
 *
 * Gera uma senha provisória forte para o owner institucional do
 * tenant-zero (e qualquer outro fluxo que precise de uma senha temporária
 * segura). Usa `crypto.randomInt` (CSPRNG, não `Math.random()`), garante
 * pelo menos um caractere de cada classe exigida, e não deriva de nenhum
 * dado de entrada (nome, projeto, data) — cada chamada é independente e
 * imprevisível.
 *
 * Parte 75: o símbolo original incluía `()[]{}"^` — caracteres que, embora
 * não "ambíguos" no sentido de l/O/0/1, são propensos a erro de cópia/
 * digitação manual (parênteses/colchetes/chaves fáceis de trocar entre si
 * ou de perder ao copiar de uma bolha de chat). Restrito a um conjunto sem
 * aspas, crases, barras invertidas, espaços ou pares que se abrem/fecham.
 *
 * Nunca logar, commitar ou persistir o valor retornado em texto plano por
 * mais tempo do que o necessário para entregá-lo ao destinatário (ver
 * bootstrap-tenant-zero.cli.ts, que só imprime em stdout interativo local,
 * nunca em execução não-interativa/CI).
 */
import { randomInt } from 'node:crypto';

const LOWER = 'abcdefghijkmnopqrstuvwxyz'; // sem "l" (confunde com "1"/"I")
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // sem "O" (confunde com "0")
const DIGITS = '23456789'; // sem "0"/"1"
const SYMBOLS = '!@#$%&*+-=?_'; // sem aspas/crases/barras/espaços/parênteses/colchetes/chaves
const ALL = LOWER + UPPER + DIGITS + SYMBOLS;

const MIN_LENGTH = 28;

function pick(charset: string): string {
  return charset[randomInt(charset.length)];
}

function shuffle(chars: string[]): string[] {
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars;
}

export function generateStrongPassword(length = MIN_LENGTH): string {
  if (length < MIN_LENGTH) {
    throw new Error(`generateStrongPassword: length deve ser >= ${MIN_LENGTH}`);
  }

  const required = [pick(LOWER), pick(UPPER), pick(DIGITS), pick(SYMBOLS)];
  const rest = Array.from({ length: length - required.length }, () => pick(ALL));

  return shuffle([...required, ...rest]).join('');
}
