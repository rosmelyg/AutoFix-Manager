import { VehicleModel } from '../models/VehicleModel.js';
import { JobOrderModel } from '../models/JobOrderModel.js';
import { PartModel } from '../models/PartModel.js';
import { BrandModel } from '../models/BrandModel.js';
import sequelize from '../utils/DbConnection.js';
import { Op } from 'sequelize';

export const getDashboard = async (req, res) => {
  try {
    const totalVehicles = await VehicleModel.count();
    const totalOrders = await JobOrderModel.count();

    const activeOrdersCount = await JobOrderModel.count({
      where: {
        status: {
          [Op.in]: ['Recibida', 'En diagnóstico', 'En reparación', 'Esperando piezas', 'Lista para entrega']
        }
      }
    });

    const deliveredOrdersCount = await JobOrderModel.count({
      where: { status: 'Entregada' }
    });

    const canceledOrdersCount = await JobOrderModel.count({
      where: { status: 'Cancelada' }
    });

    const deliveredOrders = await JobOrderModel.findAll({
      where: { status: 'Entregada' },
      attributes: ['totalGeneral']
    });

    const totalRevenueNumber = deliveredOrders.reduce(
      (acc, order) => acc + parseFloat(order.totalGeneral || 0),
      0
    );

    // Contar piezas con bajo inventario (stockActual <= stockMinimo)
    const allParts = await PartModel.findAll({
      attributes: ['stockActual', 'stockMinimo']
    });
    const lowStockPartsCount = allParts.filter(
      p => p.stockActual <= p.stockMinimo
    ).length;

    // Últimas 5 órdenes de trabajo registradas
    const recentOrders = await JobOrderModel.findAll({
      limit: 5,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: VehicleModel,
          include: [{ model: BrandModel }]
        }
      ]
    });

    res.render('home/index', {
      title: 'AutoFix Manager - Dashboard Principal',
      activeHome: true,
      totalVehicles,
      totalOrders,
      activeOrdersCount,
      deliveredOrdersCount,
      canceledOrdersCount,
      totalRevenue: totalRevenueNumber.toFixed(2),
      lowStockPartsCount,
      recentOrders: recentOrders.map(o => o.toJSON())
    });
  } catch (error) {
    console.error('Error al cargar el resumen del dashboard:', error);
    res.status(500).render('error', { 
      message: 'No fue posible cargar el resumen del taller.' 
    });
  }
};
