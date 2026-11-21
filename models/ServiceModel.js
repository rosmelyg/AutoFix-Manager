import { DataTypes } from 'sequelize';
import sequelize from '../utils/DbConnection.js';

export const ServiceModel = sequelize.define('Service', {
  id: { 
    type: DataTypes.INTEGER, 
    primaryKey: true, 
    autoIncrement: true 
  },
  name: { 
    type: DataTypes.STRING, 
    allowNull: false, 
    unique: true,
    set(val) {
      this.setDataValue('name', val ? val.trim() : '');
    }
  },
  description: { 
    type: DataTypes.TEXT, 
    allowNull: true 
  },
  category: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },
  basePrice: { 
    type: DataTypes.DECIMAL(10, 2), 
    allowNull: false 
  },
  estimatedDurationMinutes: { 
    type: DataTypes.INTEGER, 
    allowNull: true 
  },
  status: { 
    type: DataTypes.STRING, 
    allowNull: false,
    defaultValue: 'Activo' 
  }
}, {
  tableName: 'services',
  timestamps: true
});