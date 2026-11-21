import express from 'express';
import { getDashboard } from '../Controllers/HomeController.js';

const router = express.Router();

router.get('/', getDashboard);

export default router;
