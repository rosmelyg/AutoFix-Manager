import express from 'express';
import { 
  getBrands, 
  renderCreateBrand, 
  createBrand, 
  renderEditBrand,
  updateBrand,
  getBrandDetail,
  deleteBrand 
} from '../Controllers/BrandController.js';

const router = express.Router();

router.get('/', getBrands);
router.get('/create', renderCreateBrand);
router.post('/create', createBrand);
router.get('/edit/:id', renderEditBrand);
router.post('/edit/:id', updateBrand);
router.get('/detail/:id', getBrandDetail);
router.post('/delete/:id', deleteBrand);

export default router;
