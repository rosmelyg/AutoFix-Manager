import { DataTypes } from 'sequelize';
import sequelize from '../utils/DbConnection.js';
import { JobOrderModel } from './JobOrderModel.js';

export const EvidenceModel = sequelize.define('Evidence', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  imagePath: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.STRING, allowNull: true }
}, { tableName: 'evidences', timestamps: true });


JobOrderModel.hasMany(EvidenceModel, { foreignKey: 'jobOrderId', onDelete: 'CASCADE' });
EvidenceModel.belongsTo(JobOrderModel, { foreignKey: 'jobOrderId' });