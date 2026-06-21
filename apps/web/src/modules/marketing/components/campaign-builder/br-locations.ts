/**
 * Brazilian states + a curated set of cities (capitals + major metros) for the
 * structured location picker. Not exhaustive (BR has ~5.570 municipalities); it
 * covers the capitals and the largest cities so campaigns target real places
 * instead of free text. Each option is "UF - Cidade".
 */

export interface BrLocation {
  uf: string;
  city: string;
  label: string;
}

const RAW: Array<[string, string[]]> = [
  ['AC', ['Rio Branco', 'Cruzeiro do Sul']],
  ['AL', ['Maceió', 'Arapiraca']],
  ['AP', ['Macapá', 'Santana']],
  ['AM', ['Manaus', 'Parintins']],
  ['BA', ['Salvador', 'Feira de Santana', 'Vitória da Conquista', 'Camaçari']],
  ['CE', ['Fortaleza', 'Caucaia', 'Juazeiro do Norte']],
  ['DF', ['Brasília']],
  ['ES', ['Vitória', 'Vila Velha', 'Serra', 'Cariacica']],
  ['GO', ['Goiânia', 'Aparecida de Goiânia', 'Anápolis']],
  ['MA', ['São Luís', 'Imperatriz']],
  ['MT', ['Cuiabá', 'Várzea Grande', 'Rondonópolis']],
  ['MS', ['Campo Grande', 'Dourados']],
  ['MG', ['Belo Horizonte', 'Uberlândia', 'Contagem', 'Juiz de Fora', 'Betim']],
  ['PA', ['Belém', 'Ananindeua', 'Santarém']],
  ['PB', ['João Pessoa', 'Campina Grande']],
  ['PR', ['Curitiba', 'Londrina', 'Maringá', 'Ponta Grossa', 'Cascavel']],
  ['PE', ['Recife', 'Jaboatão dos Guararapes', 'Olinda', 'Caruaru']],
  ['PI', ['Teresina', 'Parnaíba']],
  ['RJ', ['Rio de Janeiro', 'São Gonçalo', 'Duque de Caxias', 'Niterói', 'Nova Iguaçu']],
  ['RN', ['Natal', 'Mossoró']],
  ['RS', ['Porto Alegre', 'Caxias do Sul', 'Pelotas', 'Canoas', 'Santa Maria']],
  ['RO', ['Porto Velho', 'Ji-Paraná']],
  ['RR', ['Boa Vista']],
  ['SC', ['Florianópolis', 'Joinville', 'Blumenau', 'Chapecó', 'Criciúma']],
  ['SP', ['São Paulo', 'Guarulhos', 'Campinas', 'São Bernardo do Campo', 'Santo André', 'Ribeirão Preto', 'Sorocaba', 'Santos']],
  ['SE', ['Aracaju', 'Nossa Senhora do Socorro']],
  ['TO', ['Palmas', 'Araguaína']],
];

export const BR_STATES: Array<{ uf: string; name: string }> = [
  { uf: 'AC', name: 'Acre' }, { uf: 'AL', name: 'Alagoas' }, { uf: 'AP', name: 'Amapá' },
  { uf: 'AM', name: 'Amazonas' }, { uf: 'BA', name: 'Bahia' }, { uf: 'CE', name: 'Ceará' },
  { uf: 'DF', name: 'Distrito Federal' }, { uf: 'ES', name: 'Espírito Santo' }, { uf: 'GO', name: 'Goiás' },
  { uf: 'MA', name: 'Maranhão' }, { uf: 'MT', name: 'Mato Grosso' }, { uf: 'MS', name: 'Mato Grosso do Sul' },
  { uf: 'MG', name: 'Minas Gerais' }, { uf: 'PA', name: 'Pará' }, { uf: 'PB', name: 'Paraíba' },
  { uf: 'PR', name: 'Paraná' }, { uf: 'PE', name: 'Pernambuco' }, { uf: 'PI', name: 'Piauí' },
  { uf: 'RJ', name: 'Rio de Janeiro' }, { uf: 'RN', name: 'Rio Grande do Norte' }, { uf: 'RS', name: 'Rio Grande do Sul' },
  { uf: 'RO', name: 'Rondônia' }, { uf: 'RR', name: 'Roraima' }, { uf: 'SC', name: 'Santa Catarina' },
  { uf: 'SP', name: 'São Paulo' }, { uf: 'SE', name: 'Sergipe' }, { uf: 'TO', name: 'Tocantins' },
];

export const BR_LOCATIONS: BrLocation[] = [
  // Whole-state options ("UF - Todo o estado")
  ...BR_STATES.map((s) => ({ uf: s.uf, city: `${s.name} (todo o estado)`, label: `${s.uf} - ${s.name} (todo o estado)` })),
  // City options
  ...RAW.flatMap(([uf, cities]) => cities.map((city) => ({ uf, city, label: `${uf} - ${city}` }))),
];
