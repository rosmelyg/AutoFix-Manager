import express from 'express';
import { 
  getServices, 
  renderCreateService, 
  createService, 
  renderEditService,
  updateService,
  getServiceDetail,
  deleteService 
} from '../Controllers/ServiceController.js';

const router = express.Router();

router.get('/', getServices);
router.get('/create', renderCreateService);
router.post('/create', createService);
router.get('/edit/:id', renderEditService);
router.post('/edit/:id', updateService);
router.get('/detail/:id', getServiceDetail);
router.post('/delete/:id', deleteService);

export default router;
