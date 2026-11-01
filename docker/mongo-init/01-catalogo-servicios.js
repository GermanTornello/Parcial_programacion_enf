// Catálogo de servicios inicial (contrato, sección 2.8).
// Lo ejecuta la imagen oficial de MongoDB la PRIMERA vez que se crea el volumen.
// Si lo cambian: `docker compose down -v` y volver a levantar.
// Los _id son fijos porque los enfermeros de prueba (usuarios-service) los referencian.

const solicitudes = db.getSiblingDB('solicitudes_db');
const ahora = new Date();

const catalogo = [
  {
    _id: ObjectId('650000000000000000000001'),
    nombre: 'Curaciones',
    descripcion: 'Limpieza y curación de heridas, úlceras y escaras',
    duracionEstimadaMin: 60,
    precioReferencia: 9000,
  },
  {
    _id: ObjectId('650000000000000000000002'),
    nombre: 'Inyecciones',
    descripcion: 'Aplicación de inyectables intramusculares, subcutáneos o endovenosos con receta',
    duracionEstimadaMin: 60,
    precioReferencia: 5000,
  },
  {
    _id: ObjectId('650000000000000000000003'),
    nombre: 'Control de signos vitales',
    descripcion: 'Presión arterial, frecuencia cardíaca, temperatura, saturación y glucemia',
    duracionEstimadaMin: 60,
    precioReferencia: 6000,
  },
  {
    _id: ObjectId('650000000000000000000004'),
    nombre: 'Higiene y confort',
    descripcion: 'Higiene personal y cambio de posición de pacientes con movilidad reducida',
    duracionEstimadaMin: 60,
    precioReferencia: 12000,
  },
  {
    _id: ObjectId('650000000000000000000005'),
    nombre: 'Acompañamiento de adultos mayores',
    descripcion: 'Acompañamiento, control de medicación y cuidados básicos',
    duracionEstimadaMin: 120,
    precioReferencia: 20000,
  },
  {
    _id: ObjectId('650000000000000000000006'),
    nombre: 'Cuidados Intensivos',
    descripcion: 'Cuidados domiciliarios de pacientes complejos (oxigenoterapia, sondas, etc.)',
    duracionEstimadaMin: 120,
    precioReferencia: 30000,
  },
];

// upsert: si el servicio ya existe no se duplica
catalogo.forEach((servicio) => {
  solicitudes.servicios.updateOne(
    { _id: servicio._id },
    { $setOnInsert: { ...servicio, activo: true, createdAt: ahora, updatedAt: ahora } },
    { upsert: true },
  );
});

// El mismo índice único que crea solicitudes-service (nombre del servicio)
solicitudes.servicios.createIndex({ nombre: 1 }, { unique: true });

print(`Catálogo de servicios cargado: ${solicitudes.servicios.countDocuments()} servicios`);
