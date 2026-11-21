import { DataTypes } from 'sequelize';
import sequelize from '../utils/DbConnection.js';
import { JobOrderModel } from './JobOrderModel.js';
import { ServiceModel } from './ServiceModel.js';

export const JobOrderServiceModel = sequelize.define('JobOrderService', {
  id: { 
    type: DataTypes.INTEGER, 
    primaryKey: true, 
    autoIncrement: true 
  },
  appliedPrice: { 
    type: DataTypes.DECIMAL(10, 2), 
    allowNull: false 
  },
  note: { 
    type: DataTypes.TEXT, 
    allowNull: true 
  }
}, { 
  tableName: 'job_order_services', 
  timestamps: true 
});

// Many to many relationship through JobOrderServiceModel
JobOrderModel.belongsToMany(ServiceModel, { through: JobOrderServiceModel, foreignKey: 'jobOrderId' });
ServiceModel.belongsToMany(JobOrderModel, { through: JobOrderServiceModel, foreignKey: 'serviceId' });

// Direct associations for line item querying
JobOrderModel.hasMany(JobOrderServiceModel, { foreignKey: 'jobOrderId', onDelete: 'CASCADE' });
JobOrderServiceModel.belongsTo(JobOrderModel, { foreignKey: 'jobOrderId' });

JobOrderServiceModel.belongsTo(ServiceModel, { foreignKey: 'serviceId' });
ServiceModel.hasMany(JobOrderServiceModel, { foreignKey: 'serviceId', onDelete: 'RESTRICT' });
