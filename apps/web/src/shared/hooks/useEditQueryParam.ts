import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { storage } from "@/shared/lib/storage";

export interface HasId {
  id?: unknown;
}

/**
 * Resolve `?<paramName>=<id>` para abrir um registro (ex.: modal de edição)
 * vindo de um deep link.
 *
 * `items` é tipicamente a lista "me dê tudo" de um hook como useContratos()
 * — que hoje, sem paginação, fica presa ao default de 50 registros do
 * backend (ver PaginationDto). Sem o parâmetro `table`, o comportamento é
 * idêntico ao original: só resolve se o id estiver entre os `items` já
 * carregados. Passando `table` (a chave usada em TABLE_ENDPOINT), quando o
 * id não é encontrado na lista carregada, busca DIRETO por ID
 * (GET /:resource/:id) — Task I: um link `?edit=<id-do-registro-75>` agora
 * resolve mesmo que o registro esteja fora dos primeiros carregados.
 */
export function useEditQueryParam<T extends HasId>(
  paramName: string,
  items: ReadonlyArray<T> | undefined,
  onMatch: (item: T) => void,
  table?: string,
): void {
  const [searchParams, setSearchParams] = useSearchParams();
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    const id = searchParams.get(paramName);
    if (!id) return;
    if (handledRef.current === id) return;

    const consume = (found: T) => {
      handledRef.current = id;
      onMatch(found);
      const next = new URLSearchParams(searchParams);
      next.delete(paramName);
      setSearchParams(next, { replace: true });
    };

    const match = items?.find((x) => String(x.id) === id);
    if (match) {
      consume(match);
      return;
    }

    // Não achou na lista carregada — pode estar fora dos primeiros
    // registros (ou a lista ainda não chegou). Sem `table`, mantém o
    // comportamento original: espera a lista carregar/crescer.
    if (!table || !items || items.length === 0) return;

    let cancelled = false;
    (storage.findById(table, id) as Promise<T | undefined>).then((found) => {
      if (cancelled || !found) return;
      consume(found);
    });
    return () => { cancelled = true; };
  }, [searchParams, items, paramName, onMatch, setSearchParams, table]);
}
