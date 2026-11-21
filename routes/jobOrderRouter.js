import express from 'express';
import {
  getJobOrders,
  renderCreateJobOrder,
  createJobOrder,
  getJobOrderDetail,
  renderEditJobOrder,
  updateJobOrder,
  changeOrderStatus,
  cancelJobOrder,
  addServiceToOrder,
  deleteServiceFromOrder,
  addPartToOrder,
  deletePartFromOrder,
  uploadEvidence,
  deleteEvidence,
  updateOrderFinances
} from '../Controllers/JobOrderController.js';
import { upload } from '../utils/FileHandler.js';

const router = express.Router();

const handleEvidenceUpload = (req, res, next) => {
  upload.single('image')(req, res, (error) => {
    if (!error) {
      return next();
    }

    let message;
    if (error.code === 'LIMIT_FILE_SIZE') {
      message = 'La imagen no puede superar los 2 MB.';
    } else if (error.message.startsWith('Solo se permiten imágenes')) {
      message = error.message;
    } else {
      console.error('Error al procesar la imagen de evidencia:', error);
      message = 'No fue posible procesar la imagen de evidencia. Verifique el archivo e inténtelo de nuevo.';
    }

    return res.redirect(`/job-orders/detail/${req.params.id}?error=${encodeURIComponent(message)}`);
  });
};

router.get('/', getJobOrders);
router.get('/create', renderCreateJobOrder);
router.post('/create', createJobOrder);
router.get('/detail/:id', getJobOrderDetail);
router.get('/edit/:id', renderEditJobOrder);
router.post('/edit/:id', updateJobOrder);
router.post('/status/:id', changeOrderStatus);
router.post('/cancel/:id', cancelJobOrder);

// Sub-recursos de la orden de trabajo
router.post('/:id/services/add', addServiceToOrder);
router.post('/:id/services/delete/:junctionId', deleteServiceFromOrder);
router.post('/:id/parts/add', addPartToOrder);
router.post('/:id/parts/delete/:junctionId', deletePartFromOrder);
router.post('/:id/evidence/upload', handleEvidenceUpload, uploadEvidence);
router.post('/:id/evidence/delete/:evidenceId', deleteEvidence);
router.post('/:id/finances', updateOrderFinances);

export default router;
