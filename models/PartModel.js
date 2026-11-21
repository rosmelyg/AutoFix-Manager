import { DataTypes } from 'sequelize';
import sequelize from '../utils/DbConnection.js';

export const PartModel = sequelize.define('Part', {
  id: { 
    type: DataTypes.INTEGER, 
    primaryKey: true, 
    autoIncrement: true 
  },
  code: { 
    type: DataTypes.STRING, 
    allowNull: false, 
    unique: true,
    set(val) {
      this.setDataValue('code', val ? val.trim().toUpperCase() : '');
    }
  },
  name: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },
  description: { 
    type: DataTypes.TEXT, 
    allowNull: true 
  },
  category: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },
  stockActual: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    defaultValue: 0 
  },
  stockMinimo: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    defaultValue: 0 
  },
  unitCost: { 
    type: DataTypes.DECIMAL(10, 2), 
    allowNull: false 
  },
  salePrice: { 
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
    defaultValue: 'Activa' 
  }
}, {
  tableName: 'parts',
  timestamps: true
});