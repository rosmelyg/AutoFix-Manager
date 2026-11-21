import express from 'express';
import { 
  getParts, 
  renderCreatePart, 
  createPart, 
  renderEditPart,
  updatePart,
  getPartDetail,
  deletePart 
} from '../Controllers/PartController.js';
import { upload } from '../utils/FileHandler.js';

const router = express.Router();

router.get('/', getParts);
router.get('/create', renderCreatePart);
router.post('/create', upload.single('image'), createPart);
router.get('/edit/:id', renderEditPart);
router.post('/edit/:id', upload.single('image'), updatePart);
router.get('/detail/:id', getPartDetail);
router.post('/delete/:id', deletePart);

export default router;
