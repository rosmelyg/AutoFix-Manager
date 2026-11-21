import sequelize from '../utils/DbConnection.js';
import { BrandModel } from '../models/BrandModel.js';
import { VehicleModel } from '../models/VehicleModel.js';
import { ServiceModel } from '../models/ServiceModel.js';
import { PartModel } from '../models/PartModel.js';
import { JobOrderModel } from '../models/JobOrderModel.js';
import { JobOrderServiceModel } from '../models/JobOrderServiceModel.js';
import { JobOrderPartModel } from '../models/JobOrderPartModel.js';
import { EvidenceModel } from '../models/EvidenceModel.js';

export const initAppContext = async () => {
  try {
    // Sincroniza todos los modelos con la base de datos
    await sequelize.sync();
    console.log('[AppContext] Modelos y tablas sincronizados correctamente.');
  } catch (error) {
    console.error('[AppContext] Error al sincronizar el contexto de la base de datos:', error);
  }
};

export {
  sequelize,
  BrandModel,
  VehicleModel,
  ServiceModel,
  PartModel,
  JobOrderModel,
  JobOrderServiceModel,
  JobOrderPartModel,
  EvidenceModel
};
