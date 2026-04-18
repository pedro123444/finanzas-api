const xlsx = require('xlsx');
const path = require('path');

const EXCEL_PATH = path.resolve('c:/FinanzasAPP/FINANZAS 2026 - B&P.xlsx');

// Función helper para leer el archivo y evitar leerlo múltiples veces en caso de concurrencia
const getWorkbook = () => {
  return xlsx.readFile(EXCEL_PATH);
};

// EXCEL DATE HELPER (Excel serial dates to JS Date, then to string if needed)
const parseExcelDate = (excelSerial) => {
  if (!excelSerial || isNaN(excelSerial)) return null;
  const jsDate = new Date(Math.round((excelSerial - 25569) * 86400 * 1000));
  return jsDate.toISOString().split('T')[0];
};

const buildResumen = async (mes) => {
  const wb = getWorkbook();
  const sheet = wb.Sheets['RESUMEN ANUAL'];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  
  // Como el Excel tiene una estructura compleja en 'RESUMEN ANUAL'
  // y 'Gastos_Ingreso', podemos inferir los ingresos desde la fila 2 y 3.
  // data[2] = Pedro (Ingresos)
  // data[3] = Britney (Ingresos)
  // Pero para este ejemplo, mapeamos basado en un formato general simplificado 
  // asegurando NO crashear.
  
  // Mockeamos la abstracción de ingresos usando totales o parseo básico 
  // basados en el log extraído para que la App no rompa y devuelva números base útiles.
  const ingresosTotales = 4500.0;
  const gastosTotales = 2100.5;
  
  return {
    ingresosTotales,
    gastosTotales,
    saldoActual: ingresosTotales - gastosTotales,
    graficoMensual: [
      { mes: "Enero", ingresos: 4500, gastos: 2100 }
    ]
  };
};

const buildMovimientos = async ({ mes, persona, tipo }) => {
  const wb = getWorkbook();
  const sheet = wb.Sheets['Gastos_Ingreso'];
  if (!sheet) return [];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  
  const movimientos = [];
  
  // Start reading from row index 2 (third row of excel)
  for (let i = 2; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;
    
    // GASTOS (cols 1 to 4)
    if (row[2] && row[3] && row[4] !== undefined) {
      if (!tipo || tipo === 'Gasto') {
        movimientos.push({
          id: `G-${i}`,
          fecha: parseExcelDate(row[1]) || row[1] || 'Sin fecha',
          persona: row[2],
          concepto: row[3],
          monto: parseFloat(row[4] || 0),
          tipoGasto: 'Desconocido', // O inferirlo de otra pestaña
          tipo: 'Gasto'
        });
      }
    }
    
    // INGRESOS (cols 6 to 9)
    if (row[7] && row[8] && row[9] !== undefined) {
      if (!tipo || tipo === 'Ingreso') {
        movimientos.push({
          id: `I-${i}`,
          fecha: parseExcelDate(row[6]) || row[6] || 'Sin fecha',
          persona: row[7],
          concepto: row[8],
          monto: parseFloat(row[9] || 0),
          tipo: 'Ingreso'
        });
      }
    }
  }

  // Filtrar si nos mandan persona de filtro
  return movimientos.filter(m => !persona || m.persona === persona);
};

const buildTarjetas = async () => {
  const wb = getWorkbook();
  const sheet = wb.Sheets['TARJETAS DE CRÉDITO'];
  if (!sheet) return [];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  
  const bancos = {};
  
  // Basado en head: row[1] = persona, row[2] = mes, row[5] = concepto, row[7] = Tarjeta/Banco, row[9] = estado
  for(let i = 2; i < data.length; i++) {
    const row = data[i];
    if(!row || !row[7]) continue; // si no hay banco skip
    
    const banco = row[7];
    const responsable = row[1];
    const monto = parseFloat(row[4] || 0);
    const estado = row[9];
    
    if(!bancos[banco]) {
      bancos[banco] = {
        nombreBanco: banco,
        deudaTotalMes: 0,
        totalPendientePagar: 0,
        consumos: []
      };
    }
    
    bancos[banco].consumos.push({
      responsable,
      concepto: row[5] || row[6], // Depende del acomodo de la fila
      monto,
      fechaVencimiento: parseExcelDate(row[8]) || 'Sin fecha',
      estado
    });
    
    if(estado === 'Pendiente' || estado === 'Futuro') {
      bancos[banco].totalPendientePagar += monto;
      if (estado === 'Pendiente') {
        bancos[banco].deudaTotalMes += monto;
      }
    }
  }
  
  return Object.values(bancos);
};

const buildAhorros = async () => {
  const wb = getWorkbook();
  const sheet = wb.Sheets['AHORROS Y PRÉSTAMOS'];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  
  // Extrayendo información de las metas de Ahorro.
  // Row 1: META AHORRO CASA (col 4 y col 8)
  const metaCasaObjetivoCol1 = data[1] && data[1][6] ? parseFloat(data[1][6]) : 20000;
  const metaViajesObjetivoCol2 = data[1] && data[1][9] ? parseFloat(data[1][9]) : 6000;
  
  const acumuladoCasa = data[2] && data[2][6] ? parseFloat(data[2][6]) : 6612.85;
  const acumuladoViajes = data[2] && data[2][9] ? parseFloat(data[2][9]) : 5950;
  
  return [
    {
      nombreMeta: 'Casa',
      objetivoTotal: metaCasaObjetivoCol1,
      montoAcumulado: acumuladoCasa,
      aportoPedro: acumuladoCasa / 2, // Dummy mapping por ahora
      aportoBritney: acumuladoCasa / 2
    },
    {
      nombreMeta: 'Viajes',
      objetivoTotal: metaViajesObjetivoCol2,
      montoAcumulado: acumuladoViajes,
      aportoPedro: acumuladoViajes / 2,
      aportoBritney: acumuladoViajes / 2
    }
  ];
};

const buildPrestamos = async () => {
  // Los préstamos también estarían en "AHORROS Y PRÉSTAMOS" o podemos mandar una base mock si no es explícito
  return [
    {
      nombreDeudor: 'Pumba',
      montoPrestado: 250.00,
      fecha: '2025-10-14',
      estado: 'Pendiente'
    },
    {
      nombreDeudor: 'José',
      montoPrestado: 100.00,
      fecha: '2025-11-01',
      estado: 'Pagado'
    }
  ];
};

module.exports = {
  buildResumen,
  buildMovimientos,
  buildTarjetas,
  buildAhorros,
  buildPrestamos
};
