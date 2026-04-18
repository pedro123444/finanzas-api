const express = require('express');
const cors = require('cors');
require('dotenv').config();

const financeRoutes = require('./routes/financeRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Main Route Mapping
app.use('/api', financeRoutes);

// Error Handling block for non-existent routes
app.use((req, res, next) => {
  res.status(404).json({ error: 'Endpoint no encontrado' });
});

// App initialization
app.listen(PORT, () => {
  console.log(`[🚀] Backend Finanzas B&P corriendo en el puerto ${PORT}`);
});
