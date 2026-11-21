import { DataTypes } from 'sequelize';
import sequelize from '../utils/DbConnection.js';
import { VehicleModel } from './VehicleModel.js';

export const JobOrderModel = sequelize.define('JobOrder', {
  id: { 
    type: DataTypes.INTEGER, 
    primaryKey: true, 
    autoIncrement: true 
  },
  orderNumber: { 
    type: DataTypes.STRING, 
    allowNull: false, 
    unique: true 
  },
  receptionDate: { 
    type: DataTypes.DATEONLY, 
    allowNull: false 
  },
  estimatedDeliveryDate: { 
    type: DataTypes.DATEONLY, 
    allowNull: true 
  },
  entryMileage: { 
    type: DataTypes.DECIMAL(10, 2), 
    allowNull: false 
  },
  problemDescription: { 
    type: DataTypes.TEXT, 
    allowNull: false 
  },
  initialDiagnosis: { 
    type: DataTypes.TEXT, 
    allowNull: true 
  },
  observations: { 
    type: DataTypes.TEXT, 
    allowNull: true 
  },
  status: { 
    type: DataTypes.STRING, 
    allowNull: false,
    defaultValue: 'Recibida' 
  },
  discount: { 
    type: DataTypes.DECIMAL(10, 2), 
    defaultValue: 0.00 
  },
  applyTax: { 
    type: DataTypes.BOOLEAN, 
    defaultValue: false 
  },
  taxPercentage: { 
    type: DataTypes.DECIMAL(5, 2), 
    defaultValue: 0.00 
  },
  subtotalServices: { 
    type: DataTypes.DECIMAL(10, 2), 
    defaultValue: 0.00 
  },
  subtotalParts: { 
    type: DataTypes.DECIMAL(10, 2), 
    defaultValue: 0.00 
  },
  subtotalGeneral: { 
    type: DataTypes.DECIMAL(10, 2), 
    defaultValue: 0.00 
  },
  taxAmount: { 
    type: DataTypes.DECIMAL(10, 2), 
    defaultValue: 0.00 
  },
  totalGeneral: { 
    type: DataTypes.DECIMAL(10, 2), 
    defaultValue: 0.00 
  }
}, {
  tableName: 'job_orders',
  timestamps: true
});

VehicleModel.hasMany(JobOrderModel, { foreignKey: 'vehicleId', onDelete: 'RESTRICT' });
JobOrderModel.belongsTo(VehicleModel, { foreignKey: 'vehicleId' });