const { getDb, initDb } = require('../src/database');
const excelService = require('../src/services/excelService');
const fs = require('fs');
const path = require('path');

const migrate = async () => {
  try {
    // Aseguramos que la base de datos y la carpeta existan
    const dbDir = path.resolve(__dirname, '../data');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    await initDb();
    const db = await getDb();

    console.log('\n[🔄] Iniciando Migración desde Excel a SQLite...');

    // 1. Migrar Movimientos
    console.log('Migrando Movimientos...');
    // obtenemos todo sin filtros
    const movimientos = await excelService.buildMovimientos({}); 
    for (const mov of movimientos) {
      await db.run(
        `INSERT INTO movimientos (fecha, persona, categoria, concepto, monto, tipoGasto, tipo) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [mov.fecha, mov.persona, mov.categoria, mov.concepto, mov.monto, mov.tipoGasto || 'Fijo', mov.tipo]
      );
    }
    console.log(`✅ ${movimientos.length} movimientos insertados.`);

    // 2. Migrar Tarjetas (extraemos consumos a la tabla base)
    console.log('Migrando Tarjetas...');
    const bancos = await excelService.buildTarjetas();
    let consumosInsertados = 0;
    for (const b of bancos) {
      for (const consumo of b.consumos) {
        await db.run(
          `INSERT INTO tarjetas_consumos (banco, responsable, concepto, monto, fechaVencimiento, estado) VALUES (?, ?, ?, ?, ?, ?)`,
          [b.nombreBanco, consumo.responsable, consumo.concepto, consumo.monto, consumo.fechaVencimiento, consumo.estado]
        );
        consumosInsertados++;
      }
    }
    console.log(`✅ ${consumosInsertados} consumos de tarjetas insertados.`);

    // 3. Migrar Ahorros
    console.log('Migrando Ahorros...');
    const ahorros = await excelService.buildAhorros();
    for (const ahorro of ahorros) {
      await db.run(
        `INSERT INTO ahorros (nombreMeta, objetivoTotal, aportoPedro, aportoBritney) VALUES (?, ?, ?, ?)`,
        [ahorro.nombreMeta, ahorro.objetivoTotal, ahorro.aportoPedro, ahorro.aportoBritney]
      );
    }
    console.log(`✅ ${ahorros.length} metas de ahorro insertadas.`);

    // 4. Migrar Préstamos
    console.log('Migrando Préstamos...');
    const prestamos = await excelService.buildPrestamos();
    for (const prestamo of prestamos) {
      await db.run(
        `INSERT INTO prestamos (nombreDeudor, montoPrestado, fecha, estado) VALUES (?, ?, ?, ?)`,
        [prestamo.nombreDeudor, prestamo.montoPrestado, prestamo.fecha, prestamo.estado]
      );
    }
    console.log(`✅ ${prestamos.length} préstamos insertados.`);

    console.log('\n[🎉] Migración Completada Exitosamente. Puedes desechar el archivo Excel.');

  } catch (error) {
    console.error('Error durante la migración:', error);
  }
};

migrate();
