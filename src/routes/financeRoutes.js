const express = require('express');
const router = express.Router();
const financeController = require('../controllers/financeController');

// 1. Resumen
router.get('/resumen', financeController.getResumen);

// 2. Movimientos
router.get('/movimientos', financeController.getMovimientos);
router.post('/movimientos', financeController.createMovimiento);

// 3. Tarjetas
router.get('/tarjetas', financeController.getTarjetas);
router.post('/tarjetas', financeController.createConsumoTarjeta);

// 4. Ahorros
router.get('/ahorros', financeController.getAhorros);

// 5. Préstamos
router.get('/prestamos', financeController.getPrestamos);

module.exports = router;
