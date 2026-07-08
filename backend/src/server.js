import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { connectDB } from './config/db.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import reminderRoutes from './routes/reminderRoutes.js';
import summaryRoutes from './routes/summaryRoutes.js';
import { createTransactionRouter } from './routes/transactionRoutes.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

const allowedOrigins = new Set([ 
  'https://udhar-app-4.onrender.com'
]);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  }
}));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true, app: 'Udhar Tracker App' }));
app.use('/api/auth', authRoutes);
app.use('/api/customers', requireAuth, createTransactionRouter('customer'));
app.use('/api/suppliers', requireAuth, createTransactionRouter('supplier'));
app.use('/api/expenses', requireAuth, expenseRoutes);
app.use('/api/reminders', requireAuth, reminderRoutes);
app.use('/api', requireAuth, summaryRoutes);
app.use(notFound);
app.use(errorHandler);

connectDB()
  .then(() => {
    app.listen(port, () => console.log(`API running on http://localhost:${port}`));
  })
  .catch((error) => {
    console.error('Failed to connect MongoDB', error);
    process.exit(1);
  });
