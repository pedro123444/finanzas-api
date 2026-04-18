const { query } = require('../database');

// 1. GET /api/resumen
const getResumen = async (req, res) => {
  try {
    const { mes } = req.query; 

    const querystring = `
      SELECT 
        SUM(CASE WHEN tipo = 'Ingreso' THEN monto ELSE 0 END) as "ingresosTotales",
        SUM(CASE WHEN tipo = 'Gasto' THEN monto ELSE 0 END) as "gastosTotales"
      FROM movimientos
      ${mes ? "WHERE fecha LIKE $1" : ""}
    `;

    const result = await query(querystring, mes ? [`${mes}%`] : []);
    const row = result.rows[0];

    // NUMERIC returns as string in node-pg, so we parseFloat
    const ingresosTotales = parseFloat(row.ingresosTotales || 0);
    const gastosTotales = parseFloat(row.gastosTotales || 0);
    
    const graficoRows = await query(`
      SELECT 
        SUBSTRING(fecha FROM 1 FOR 7) as mes,
        SUM(CASE WHEN tipo = 'Ingreso' THEN monto ELSE 0 END) as ingresos,
        SUM(CASE WHEN tipo = 'Gasto' THEN monto ELSE 0 END) as gastos
      FROM movimientos
      GROUP BY SUBSTRING(fecha FROM 1 FOR 7)
      ORDER BY mes ASC
      LIMIT 12
    `);

    return res.status(200).json({
      ingresosTotales,
      gastosTotales,
      saldoActual: ingresosTotales - gastosTotales,
      graficoMensual: graficoRows.rows.map(r => ({
        mes: r.mes,
        ingresos: parseFloat(r.ingresos || 0),
        gastos: parseFloat(r.gastos || 0)
      }))
    });
  } catch (error) {
    console.error('Error in getResumen:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// 2. GET /api/movimientos
const getMovimientos = async (req, res) => {
  try {
    const { mes, persona, tipo } = req.query;
    
    let sqlString = `SELECT * FROM movimientos WHERE 1=1`;
    let params = [];
    let queryIndex = 1;

    if (mes) {
      sqlString += ` AND fecha LIKE $${queryIndex++}`;
      params.push(`${mes}%`);
    }
    if (persona) {
      sqlString += ` AND persona = $${queryIndex++}`;
      params.push(persona);
    }
    if (tipo) {
      sqlString += ` AND tipo = $${queryIndex++}`;
      params.push(tipo);
    }

    sqlString += ` ORDER BY fecha DESC`;
    
    const movimientos = await query(sqlString, params);
    return res.status(200).json(movimientos.rows.map(m => ({
      ...m,
      monto: parseFloat(m.monto || 0)
    })));
  } catch (error) {
    console.error('Error in getMovimientos:', error);
    return res.status(500).json({ error: 'Error obteniendo movimientos' });
  }
};

// POST /api/movimientos
const createMovimiento = async (req, res) => {
  try {
    const { fecha, persona, categoria, concepto, monto, tipoGasto, tipo } = req.body;

    const result = await query(
      `INSERT INTO movimientos (fecha, persona, categoria, concepto, monto, "tipoGasto", tipo)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [fecha, persona, categoria, concepto, parseFloat(monto || 0), tipoGasto, tipo]
    );

    return res.status(201).json({ message: 'Movimiento creado', id: result.rows[0].id });
  } catch (error) {
    console.error('Error in createMovimiento:', error);
    return res.status(500).json({ error: 'Error creando el movimiento' });
  }
};

// 3. GET /api/tarjetas
const getTarjetas = async (req, res) => {
  try {
    const result = await query(`SELECT * FROM tarjetas_consumos ORDER BY banco ASC, "fechaVencimiento" ASC`);
    
    const bancos = {};
    for (const consumo of result.rows) {
      const monto = parseFloat(consumo.monto || 0);
      const banco = consumo.banco;
      const estado = consumo.estado;
      
      if (!bancos[banco]) {
        bancos[banco] = {
          nombreBanco: banco,
          deudaTotalMes: 0,
          totalPendientePagar: 0,
          consumos: []
        };
      }
      
      bancos[banco].consumos.push({ ...consumo, monto });
      
      if(estado === 'Pendiente' || estado === 'Futuro') {
        bancos[banco].totalPendientePagar += monto;
        if (estado === 'Pendiente') {
          bancos[banco].deudaTotalMes += monto;
        }
      }
    }
    
    return res.status(200).json(Object.values(bancos));
  } catch (error) {
    console.error('Error in getTarjetas:', error);
    return res.status(500).json({ error: 'Error obteniendo tarjetas' });
  }
};

// POST /api/tarjetas
const createConsumoTarjeta = async (req, res) => {
  try {
    const { banco, responsable, concepto, monto, fechaVencimiento, estado } = req.body;

    const result = await query(
      `INSERT INTO tarjetas_consumos (banco, responsable, concepto, monto, "fechaVencimiento", estado)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [banco, responsable, concepto, parseFloat(monto || 0), fechaVencimiento, estado]
    );

    return res.status(201).json({ message: 'Consumo registrado', id: result.rows[0].id });
  } catch (error) {
    console.error('Error in createConsumoTarjeta:', error);
    return res.status(500).json({ error: 'Error registrando consumo de tarjeta' });
  }
};

// 4. GET /api/ahorros
const getAhorros = async (req, res) => {
  try {
    const result = await query(`SELECT * FROM ahorros`);
    
    return res.status(200).json(result.rows.map(a => {
      const aportoPedro = parseFloat(a.aportoPedro || 0);
      const aportoBritney = parseFloat(a.aportoBritney || 0);
      return {
        ...a,
        objetivoTotal: parseFloat(a.objetivoTotal || 0),
        aportoPedro,
        aportoBritney,
        montoAcumulado: aportoPedro + aportoBritney
      }
    }));
  } catch (error) {
    console.error('Error in getAhorros:', error);
    return res.status(500).json({ error: 'Error obteniendo ahorros' });
  }
};

// 5. GET /api/prestamos
const getPrestamos = async (req, res) => {
  try {
    const result = await query(`SELECT * FROM prestamos ORDER BY fecha DESC`);
    
    return res.status(200).json(result.rows.map(p => ({
      ...p,
      montoPrestado: parseFloat(p.montoPrestado || 0)
    })));
  } catch (error) {
    console.error('Error in getPrestamos:', error);
    return res.status(500).json({ error: 'Error obteniendo prestamos' });
  }
};

module.exports = {
  getResumen,
  getMovimientos,
  createMovimiento,
  getTarjetas,
  createConsumoTarjeta,
  getAhorros,
  getPrestamos
};
