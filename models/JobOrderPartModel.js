import { DataTypes } from 'sequelize';
import sequelize from '../utils/DbConnection.js';
import { JobOrderModel } from './JobOrderModel.js';
import { PartModel } from './PartModel.js';

export const JobOrderPartModel = sequelize.define('JobOrderPart', {
  id: { 
    type: DataTypes.INTEGER, 
    primaryKey: true, 
    autoIncrement: true 
  },
  quantity: { 
    type: DataTypes.INTEGER, 
    allowNull: false 
  },
  unitPriceApplied: { 
    type: DataTypes.DECIMAL(10, 2), 
    allowNull: false 
  },
  subtotal: { 
    type: DataTypes.DECIMAL(10, 2), 
    allowNull: false 
  }
}, { 
  tableName: 'job_order_parts', 
  timestamps: true 
});

// Many to many relationship through JobOrderPartModel
JobOrderModel.belongsToMany(PartModel, { through: JobOrderPartModel, foreignKey: 'jobOrderId' });
PartModel.belongsToMany(JobOrderModel, { through: JobOrderPartModel, foreignKey: 'partId' });

// Direct associations for line item querying
JobOrderModel.hasMany(JobOrderPartModel, { foreignKey: 'jobOrderId', onDelete: 'CASCADE' });
JobOrderPartModel.belongsTo(JobOrderModel, { foreignKey: 'jobOrderId' });

JobOrderPartModel.belongsTo(PartModel, { foreignKey: 'partId' });
PartModel.hasMany(JobOrderPartModel, { foreignKey: 'partId', onDelete: 'RESTRICT' });
