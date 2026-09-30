// datos de cada juego en un solo lugar

export type IdJuego = 'ruleta' | 'ta-te-ti' | 'sopa-de-letras';

export interface ConfigJuego {
  id: IdJuego;
  nombre: string;
  ruta: string;
  porcentaje: number;
  comoJugar: string[];
}

export const SOPA_LETRAS_PALABRAS_POR_PARTIDA = 3;
export const SOPA_LETRAS_DURACION_SEGUNDOS = 30;

export const REGLA_DESCUENTO =
  'El descuento es uno solo por estadía: cuenta únicamente tu primer intento en cualquiera de los tres juegos, y solo si sos cliente registrado. Después podés seguir jugando por diversión.';

const PORCENTAJE_RULETA = 20;
const PORCENTAJE_TA_TE_TI = 15;
const PORCENTAJE_SOPA_LETRAS = 10;

export const CONFIG_JUEGOS: Record<IdJuego, ConfigJuego> = {
  ruleta: {
    id: 'ruleta',
    nombre: 'Ruleta',
    ruta: '/juegos/ruleta',
    porcentaje: PORCENTAJE_RULETA,
    comoJugar: [
      'Tocá "Comenzar" y la ruleta empieza a girar.',
      'Tocá "Parar" cuando quieras para frenarla.',
      `Si cae en "Ganaste" (✓) ganás ${PORCENTAJE_RULETA}% de descuento en tu cuenta.`,
      'Si cae en "Perdiste" (✗) no ganás nada.',
      'Si cae en "Reintentá" (↻) podés volver a girar sin gastar tu oportunidad.',
    ],
  },
  'ta-te-ti': {
    id: 'ta-te-ti',
    nombre: 'Ta-Te-Ti',
    ruta: '/juegos/ta-te-ti',
    porcentaje: PORCENTAJE_TA_TE_TI,
    comoJugar: [
      'Vos jugás con la X y siempre empezás.',
      'Tocá una casilla vacía para marcarla. Después juega la PC con la O.',
      'Gana quien completa primero una línea de tres, en horizontal, vertical o diagonal.',
      `Si ganás, obtenés ${PORCENTAJE_TA_TE_TI}% de descuento en tu cuenta.`,
      'Si empatan, podés volver a intentar sin gastar tu oportunidad.',
    ],
  },
  'sopa-de-letras': {
    id: 'sopa-de-letras',
    nombre: 'Sopa de letras',
    ruta: '/juegos/sopa-de-letras',
    porcentaje: PORCENTAJE_SOPA_LETRAS,
    comoJugar: [
      'Tocá "Comenzar" para ver la sopa y las palabras que tenés que buscar.',
      `Tenés ${SOPA_LETRAS_DURACION_SEGUNDOS} segundos para encontrar ${SOPA_LETRAS_PALABRAS_POR_PARTIDA} palabras.`,
      'Para marcar una palabra, tocá su primera letra y después su última. Están en horizontal o en vertical, y pueden estar escritas al revés.',
      `Si las encontrás todas a tiempo, ganás ${PORCENTAJE_SOPA_LETRAS}% de descuento en tu cuenta.`,
      'Si se acaba el tiempo, perdés este intento.',
    ],
  },
};

// orden del selector de juegos
export const LISTA_JUEGOS: ConfigJuego[] = [
  CONFIG_JUEGOS.ruleta,
  CONFIG_JUEGOS['ta-te-ti'],
  CONFIG_JUEGOS['sopa-de-letras'],
];
