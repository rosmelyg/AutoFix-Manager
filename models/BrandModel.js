import { DataTypes } from 'sequelize';
import sequelize from '../utils/DbConnection.js';

export const BrandModel = sequelize.define('Brand', {
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
  originCountry: { 
    type: DataTypes.STRING, 
    allowNull: true,
    set(val) {
      this.setDataValue('originCountry', val ? val.trim() : null);
    }
  },
  status: { 
    type: DataTypes.STRING, 
    allowNull: false,
    defaultValue: 'Activa' 
  }
}, {
  tableName: 'brands',
  timestamps: true
});