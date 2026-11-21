import express from 'express';
import { 
  getVehicles, 
  renderCreateVehicle, 
  createVehicle, 
  renderEditVehicle,
  updateVehicle,
  getVehicleDetail,
  deleteVehicle 
} from '../Controllers/VehicleController.js';
import { upload } from '../utils/FileHandler.js';

const router = express.Router();

router.get('/', getVehicles);
router.get('/create', renderCreateVehicle);
router.post('/create', upload.single('image'), createVehicle);
router.get('/edit/:id', renderEditVehicle);
router.post('/edit/:id', upload.single('image'), updateVehicle);
router.get('/detail/:id', getVehicleDetail);
router.post('/delete/:id', deleteVehicle);

export default router;
