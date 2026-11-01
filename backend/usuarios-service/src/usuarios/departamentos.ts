// Los 18 departamentos de Mendoza (contrato, sección 2.6)
export const DEPARTAMENTOS = [
  'Capital',
  'Godoy Cruz',
  'Guaymallén',
  'Las Heras',
  'Luján de Cuyo',
  'Maipú',
  'Lavalle',
  'San Martín',
  'Rivadavia',
  'Junín',
  'Santa Rosa',
  'La Paz',
  'Tupungato',
  'Tunuyán',
  'San Carlos',
  'San Rafael',
  'General Alvear',
  'Malargüe',
] as const;

export type Departamento = (typeof DEPARTAMENTOS)[number];

/** Centro de Mendoza capital: se usa cuando la búsqueda no manda ubicación. */
export const MENDOZA_CAPITAL = { lat: -32.8895, lng: -68.8458 };
