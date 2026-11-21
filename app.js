import express from 'express';
import { engine } from 'express-handlebars';
import path from 'path';
import './utils/LoadEnvConfig.js';
import { PUBLIC_DIR } from './utils/Paths.js';

// import context and database connection
import { connectDB } from './utils/DbConnection.js';
import { initAppContext } from './context/AppContext.js';

// import routers
import homeRouter from './routes/home.js';
import brandRouter from './routes/brandRouter.js';
import vehicleRouter from './routes/vehicleRouter.js';
import serviceRouter from './routes/serviceRouter.js';
import partRouter from './routes/partRouter.js';
import jobOrderRouter from './routes/jobOrderRouter.js';

const app = express();
const PORT = process.env.PORT || 8080;
const currencyFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

// handlebars setup with helpers
app.engine('.hbs', engine({
  extname: '.hbs',
  defaultLayout: 'layout',
  helpers: {
    eq: (a, b) => String(a) === String(b),
    ne: (a, b) => String(a) !== String(b),
    formatCurrency: (val) => currencyFormatter.format(parseFloat(val) || 0),
    subtract: (a, b) => currencyFormatter.format(Math.max(0, (parseFloat(a) || 0) - (parseFloat(b) || 0))),
    formatDate: (val) => {
      if (!val) return '';
      if (typeof val === 'string' && val.length === 10) return val;
      const d = new Date(val);
      return isNaN(d) ? '' : d.toISOString().split('T')[0];
    },
    statusBadgeClass: (status) => {
      switch (status) {
        case 'Recibida': return 'bg-secondary';
        case 'En diagnóstico': return 'bg-info text-dark';
        case 'En reparación': return 'bg-primary';
        case 'Esperando piezas': return 'bg-warning text-dark';
        case 'Lista para entrega': return 'bg-primary text-white';
        case 'Entregada': return 'bg-success';
        case 'Cancelada': return 'bg-danger';
        default: return 'bg-secondary';
      }
    }
  }
}));
app.set('view engine', '.hbs');
app.set('views', path.join(PUBLIC_DIR, '../views'));

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(PUBLIC_DIR));

// connect to the database and initialize the app context
await connectDB();
await initAppContext();

// register routes
app.use('/', homeRouter);
app.use('/brands', brandRouter);
app.use('/vehicles', vehicleRouter);
app.use('/services', serviceRouter);
app.use('/parts', partRouter);
app.use('/job-orders', jobOrderRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).render('404', { title: 'Página no encontrada' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Error Middleware]:', err.message);
  res.status(500).render('error', { message: err.message || 'Ha ocurrido un error inesperado.' });
});

app.listen(PORT, () => {
  console.log(`[Server] AutoFix Manager ejecutándose en http://localhost:${PORT}`);
});
