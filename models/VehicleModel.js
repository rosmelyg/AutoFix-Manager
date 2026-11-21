import { DataTypes } from 'sequelize';
import sequelize from '../utils/DbConnection.js';
import { BrandModel } from './BrandModel.js';

export const VehicleModel = sequelize.define('Vehicle', {
  id: { 
    type: DataTypes.INTEGER, 
    primaryKey: true, 
    autoIncrement: true 
  },
  plate: { 
    type: DataTypes.STRING, 
    allowNull: false, 
    unique: true,
    set(val) {
      this.setDataValue('plate', val ? val.trim().toUpperCase() : '');
    }
  },
  model: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },
  year: { 
    type: DataTypes.INTEGER, 
    allowNull: false 
  },
  color: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },
  vehicleType: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },
  ownerName: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },
  ownerPhone: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },
  ownerEmail: { 
    type: DataTypes.STRING, 
    allowNull: true 
  },
  currentMileage: { 
    type: DataTypes.DECIMAL(10, 2), 
    allowNull: false 
  },
  image: { 
    type: DataTypes.STRING, 
    allowNull: true 
  },
  status: { 
    type: DataTypes.STRING, 
    allowNull: false,
    defaultValue: 'Registrado' 
  }
}, {
  tableName: 'vehicles',
  timestamps: true
});

BrandModel.hasMany(VehicleModel, { foreignKey: 'brandId', onDelete: 'RESTRICT' });
VehicleModel.belongsTo(BrandModel, { foreignKey: 'brandId' });