import { JobOrderModel } from '../models/JobOrderModel.js';
import { VehicleModel } from '../models/VehicleModel.js';
import { BrandModel } from '../models/BrandModel.js';
import { ServiceModel } from '../models/ServiceModel.js';
import { PartModel } from '../models/PartModel.js';
import { JobOrderServiceModel } from '../models/JobOrderServiceModel.js';
import { JobOrderPartModel } from '../models/JobOrderPartModel.js';
import { EvidenceModel } from '../models/EvidenceModel.js';
import sequelize from '../utils/DbConnection.js';
import { Op } from 'sequelize';
import fs from 'fs';
import path from 'path';
import { UPLOADS_DIR } from '../utils/Paths.js';

const ORDER_STATUSES = [
  'Recibida',
  'En diagnóstico',
  'En reparación',
  'Esperando piezas',
  'Lista para entrega',
  'Entregada',
  'Cancelada'
];

const ACTIVE_ORDER_STATUSES = [
  'Recibida',
  'En diagnóstico',
  'En reparación',
  'Esperando piezas',
  'Lista para entrega'
];

// Helper para recalcular totales financieros de una orden
export const recalculateJobOrder = async (orderId, transaction = null) => {
  const order = await JobOrderModel.findByPk(orderId, {
    include: [
      { model: JobOrderServiceModel },
      { model: JobOrderPartModel }
    ],
    transaction
  });

  if (!order) return null;

  const subtotalServices = (order.JobOrderServices || []).reduce(
    (sum, s) => sum + parseFloat(s.appliedPrice || 0), 0
  );

  const subtotalParts = (order.JobOrderParts || []).reduce(
    (sum, p) => sum + parseFloat(p.subtotal || 0), 0
  );

  const subtotalGeneral = subtotalServices + subtotalParts;

  let discount = parseFloat(order.discount || 0);
  if (isNaN(discount) || discount < 0) discount = 0;
  if (discount > subtotalGeneral) discount = subtotalGeneral;

  const baseImponible = Math.max(0, subtotalGeneral - discount);

  let taxPercentage = parseFloat(order.taxPercentage || 0);
  if (isNaN(taxPercentage) || taxPercentage < 0) taxPercentage = 0;
  if (taxPercentage > 100) taxPercentage = 100;

  const taxAmount = order.applyTax ? (baseImponible * (taxPercentage / 100)) : 0;
  const totalGeneral = Math.max(0, baseImponible + taxAmount);

  await order.update({
    subtotalServices: subtotalServices.toFixed(2),
    subtotalParts: subtotalParts.toFixed(2),
    subtotalGeneral: subtotalGeneral.toFixed(2),
    discount: discount.toFixed(2),
    taxPercentage: taxPercentage.toFixed(2),
    taxAmount: taxAmount.toFixed(2),
    totalGeneral: totalGeneral.toFixed(2)
  }, { transaction });

  return order;
};

// 1. Listar órdenes de trabajo
export const getJobOrders = async (req, res) => {
  try {
    const jobOrders = await JobOrderModel.findAll({
      include: [
        {
          model: VehicleModel,
          include: [{ model: BrandModel }]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.render('job-orders/index', {
      title: 'Gestión de Órdenes de Trabajo',
      activeOrders: true,
      jobOrders: jobOrders.map(o => o.toJSON()),
      success: req.query.success || null,
      error: req.query.error || null
    });
  } catch (error) {
    console.error('Error al obtener órdenes de trabajo:', error);
    res.status(500).render('error', { message: 'No fue posible cargar el listado de órdenes.' });
  }
};

// 2. Formulario para crear orden
export const renderCreateJobOrder = async (req, res) => {
  try {
    // Solo vehículos activos que NO tengan ya una orden activa en proceso
    const vehiclesWithActiveOrders = await JobOrderModel.findAll({
      where: { status: { [Op.in]: ACTIVE_ORDER_STATUSES } },
      attributes: ['vehicleId'],
      raw: true
    });

    const busyVehicleIds = vehiclesWithActiveOrders.map(o => o.vehicleId);

    const availableVehicles = await VehicleModel.findAll({
      where: {
        status: { [Op.ne]: 'Inactivo' },
        id: { [Op.notIn]: busyVehicleIds.length > 0 ? busyVehicleIds : [0] }
      },
      include: [{ model: BrandModel }],
      order: [['plate', 'ASC']]
    });

    const today = new Date().toISOString().split('T')[0];

    res.render('job-orders/create', {
      title: 'Crear Orden de Trabajo',
      activeOrders: true,
      vehicles: availableVehicles.map(v => v.toJSON()),
      order: {
        receptionDate: today,
        status: 'Recibida',
        discount: '0.00',
        applyTax: true,
        taxPercentage: '18.00'
      }
    });
  } catch (error) {
    console.error('Error al cargar formulario de orden:', error);
    res.redirect('/job-orders?error=' + encodeURIComponent('Error al cargar formulario de orden.'));
  }
};

// 3. Crear orden de trabajo
export const createJobOrder = async (req, res) => {
  try {
    let {
      orderNumber,
      vehicleId,
      receptionDate,
      estimatedDeliveryDate,
      entryMileage,
      problemDescription,
      initialDiagnosis,
      observations
    } = req.body;

    orderNumber = (orderNumber || '').trim();
    problemDescription = (problemDescription || '').trim();
    initialDiagnosis = (initialDiagnosis || '').trim();
    observations = (observations || '').trim();
    const parsedMileage = parseFloat(entryMileage);

    const loadAvailableVehicles = async () => {
      const busy = await JobOrderModel.findAll({
        where: { status: { [Op.in]: ACTIVE_ORDER_STATUSES } },
        attributes: ['vehicleId'],
        raw: true
      });
      const busyIds = busy.map(o => o.vehicleId);
      const v = await VehicleModel.findAll({
        where: {
          status: { [Op.ne]: 'Inactivo' },
          id: { [Op.notIn]: busyIds.length > 0 ? busyIds : [0] }
        },
        include: [{ model: BrandModel }],
        order: [['plate', 'ASC']]
      });
      return v.map(x => x.toJSON());
    };

    if (!orderNumber) {
      return res.render('job-orders/create', {
        title: 'Crear Orden de Trabajo',
        activeOrders: true,
        vehicles: await loadAvailableVehicles(),
        error: 'El número de orden es requerido.',
        order: req.body
      });
    }

    // Verificar número de orden único
    const existingOrder = await JobOrderModel.findOne({ where: { orderNumber } });
    if (existingOrder) {
      return res.render('job-orders/create', {
        title: 'Crear Orden de Trabajo',
        activeOrders: true,
        vehicles: await loadAvailableVehicles(),
        error: 'Ya existe una orden registrada con ese número.',
        order: req.body
      });
    }

    if (!vehicleId) {
      return res.render('job-orders/create', {
        title: 'Crear Orden de Trabajo',
        activeOrders: true,
        vehicles: await loadAvailableVehicles(),
        error: 'El vehículo es requerido.',
        order: req.body
      });
    }

    const vehicle = await VehicleModel.findByPk(vehicleId);
    if (!vehicle || vehicle.status === 'Inactivo') {
      return res.render('job-orders/create', {
        title: 'Crear Orden de Trabajo',
        activeOrders: true,
        vehicles: await loadAvailableVehicles(),
        error: 'El vehículo seleccionado no está disponible.',
        order: req.body
      });
    }

    // Verificar que el vehículo no tenga ya una orden activa
    const hasActiveOrder = await JobOrderModel.findOne({
      where: {
        vehicleId,
        status: { [Op.in]: ACTIVE_ORDER_STATUSES }
      }
    });
    if (hasActiveOrder) {
      return res.render('job-orders/create', {
        title: 'Crear Orden de Trabajo',
        activeOrders: true,
        vehicles: await loadAvailableVehicles(),
        error: 'El vehículo seleccionado ya tiene una orden activa en proceso.',
        order: req.body
      });
    }

    if (!receptionDate) {
      return res.render('job-orders/create', {
        title: 'Crear Orden de Trabajo',
        activeOrders: true,
        vehicles: await loadAvailableVehicles(),
        error: 'La fecha de recepción es requerida.',
        order: req.body
      });
    }

    if (estimatedDeliveryDate && estimatedDeliveryDate < receptionDate) {
      return res.render('job-orders/create', {
        title: 'Crear Orden de Trabajo',
        activeOrders: true,
        vehicles: await loadAvailableVehicles(),
        error: 'La fecha estimada de entrega debe ser igual o mayor que la fecha de recepción.',
        order: req.body
      });
    }

    if (isNaN(parsedMileage)) {
      return res.render('job-orders/create', {
        title: 'Crear Orden de Trabajo',
        activeOrders: true,
        vehicles: await loadAvailableVehicles(),
        error: 'El kilometraje de entrada es requerido.',
        order: req.body
      });
    }

    if (parsedMileage < parseFloat(vehicle.currentMileage)) {
      return res.render('job-orders/create', {
        title: 'Crear Orden de Trabajo',
        activeOrders: true,
        vehicles: await loadAvailableVehicles(),
        error: 'El kilometraje de entrada no puede ser menor que el kilometraje actual registrado.',
        order: req.body
      });
    }

    if (!problemDescription) {
      return res.render('job-orders/create', {
        title: 'Crear Orden de Trabajo',
        activeOrders: true,
        vehicles: await loadAvailableVehicles(),
        error: 'La descripción del problema es requerida.',
        order: req.body
      });
    }

    const newOrder = await JobOrderModel.create({
      orderNumber,
      vehicleId,
      receptionDate,
      estimatedDeliveryDate: estimatedDeliveryDate || null,
      entryMileage: parsedMileage,
      problemDescription,
      initialDiagnosis: initialDiagnosis || null,
      observations: observations || null,
      status: 'Recibida',
      discount: 0.00,
      applyTax: true,
      taxPercentage: 18.00,
      subtotalServices: 0.00,
      subtotalParts: 0.00,
      subtotalGeneral: 0.00,
      taxAmount: 0.00,
      totalGeneral: 0.00
    });

    // Regla: Al crear una orden en estado recibida, el vehículo asociado debe pasar a estado en taller.
    await vehicle.update({ status: 'En taller', currentMileage: parsedMileage });

    res.redirect(`/job-orders/detail/${newOrder.id}?success=` + encodeURIComponent('La orden de trabajo fue registrada correctamente.'));
  } catch (error) {
    console.error('Error al crear orden de trabajo:', error);
    res.redirect('/job-orders?error=' + encodeURIComponent('Error al registrar la orden de trabajo.'));
  }
};

// 4. Ver detalle completo de una orden
export const getJobOrderDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await JobOrderModel.findByPk(id, {
      include: [
        {
          model: VehicleModel,
          include: [{ model: BrandModel }]
        },
        {
          model: JobOrderServiceModel,
          include: [{ model: ServiceModel }]
        },
        {
          model: JobOrderPartModel,
          include: [{ model: PartModel }]
        },
        {
          model: EvidenceModel
        }
      ]
    });

    if (!order) {
      return res.status(404).render('404', { title: 'Orden no encontrada' });
    }

    // Catálogo de servicios activos
    const activeServices = await ServiceModel.findAll({
      where: { status: 'Activo' },
      order: [['name', 'ASC']]
    });

    // Catálogo de repuestos activos con stock > 0
    const activeParts = await PartModel.findAll({
      where: { 
        status: 'Activa',
        stockActual: { [Op.gt]: 0 }
      },
      order: [['name', 'ASC']]
    });

    const isClosed = order.status === 'Entregada' || order.status === 'Cancelada';

    res.render('job-orders/detail', {
      title: `Orden #${order.orderNumber}`,
      activeOrders: true,
      order: order.toJSON(),
      servicesList: (order.JobOrderServices || []).map(s => s.toJSON()),
      partsList: (order.JobOrderParts || []).map(p => p.toJSON()),
      evidencesList: (order.Evidence || []).map(e => {
        const evidence = e.toJSON();
        return {
          ...evidence,
          imagePath: `/uploads/${path.basename(evidence.imagePath)}`
        };
      }),
      activeServices: activeServices.map(s => s.toJSON()),
      activeParts: activeParts.map(p => p.toJSON()),
      orderStatuses: ORDER_STATUSES,
      isClosed,
      success: req.query.success || null,
      error: req.query.error || null
    });
  } catch (error) {
    console.error('Error al ver detalle de orden:', error);
    res.redirect('/job-orders?error=' + encodeURIComponent('No fue posible cargar el detalle de la orden.'));
  }
};

// 5. Formulario de edición de orden (datos generales)
export const renderEditJobOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await JobOrderModel.findByPk(id, {
      include: [
        {
          model: VehicleModel,
          include: [{ model: BrandModel }]
        }
      ]
    });

    if (!order) {
      return res.status(404).render('404', { title: 'Orden no encontrada' });
    }

    // Regla: Una orden en estado entregada o cancelada no puede ser modificada.
    if (order.status === 'Entregada') {
      return res.redirect(`/job-orders/detail/${id}?error=` + encodeURIComponent('Una orden entregada no puede ser modificada.'));
    }
    if (order.status === 'Cancelada') {
      return res.redirect(`/job-orders/detail/${id}?error=` + encodeURIComponent('Una orden cancelada no puede ser modificada.'));
    }

    res.render('job-orders/edit', {
      title: `Editar Orden #${order.orderNumber}`,
      activeOrders: true,
      order: order.toJSON()
    });
  } catch (error) {
    console.error('Error al cargar edición de orden:', error);
    res.redirect('/job-orders?error=' + encodeURIComponent('No fue posible cargar la orden.'));
  }
};

// 6. Actualizar datos generales de orden
export const updateJobOrder = async (req, res) => {
  const { id } = req.params;
  try {
    const order = await JobOrderModel.findByPk(id, {
      include: [{ model: VehicleModel }]
    });

    if (!order) {
      return res.status(404).render('404', { title: 'Orden no encontrada' });
    }

    if (order.status === 'Entregada') {
      return res.redirect(`/job-orders/detail/${id}?error=` + encodeURIComponent('Una orden entregada no puede ser modificada.'));
    }
    if (order.status === 'Cancelada') {
      return res.redirect(`/job-orders/detail/${id}?error=` + encodeURIComponent('Una orden cancelada no puede ser modificada.'));
    }

    let {
      receptionDate,
      estimatedDeliveryDate,
      entryMileage,
      problemDescription,
      initialDiagnosis,
      observations
    } = req.body;

    problemDescription = (problemDescription || '').trim();
    initialDiagnosis = (initialDiagnosis || '').trim();
    observations = (observations || '').trim();
    const parsedMileage = parseFloat(entryMileage);

    if (!receptionDate) {
      return res.render('job-orders/edit', {
        title: `Editar Orden #${order.orderNumber}`,
        activeOrders: true,
        order: { ...order.toJSON(), ...req.body },
        error: 'La fecha de recepción es requerida.'
      });
    }

    if (estimatedDeliveryDate && estimatedDeliveryDate < receptionDate) {
      return res.render('job-orders/edit', {
        title: `Editar Orden #${order.orderNumber}`,
        activeOrders: true,
        order: { ...order.toJSON(), ...req.body },
        error: 'La fecha estimada de entrega debe ser igual o mayor que la fecha de recepción.'
      });
    }

    if (isNaN(parsedMileage)) {
      return res.render('job-orders/edit', {
        title: `Editar Orden #${order.orderNumber}`,
        activeOrders: true,
        order: { ...order.toJSON(), ...req.body },
        error: 'El kilometraje de entrada es requerido.'
      });
    }

    if (parsedMileage < parseFloat(order.Vehicle.currentMileage)) {
      return res.render('job-orders/edit', {
        title: `Editar Orden #${order.orderNumber}`,
        activeOrders: true,
        order: { ...order.toJSON(), ...req.body },
        error: 'El kilometraje de entrada no puede ser menor que el kilometraje actual registrado.'
      });
    }

    if (!problemDescription) {
      return res.render('job-orders/edit', {
        title: `Editar Orden #${order.orderNumber}`,
        activeOrders: true,
        order: { ...order.toJSON(), ...req.body },
        error: 'La descripción del problema es requerida.'
      });
    }

    await order.update({
      receptionDate,
      estimatedDeliveryDate: estimatedDeliveryDate || null,
      entryMileage: parsedMileage,
      problemDescription,
      initialDiagnosis: initialDiagnosis || null,
      observations: observations || null
    });

    res.redirect(`/job-orders/detail/${id}?success=` + encodeURIComponent('La orden fue actualizada correctamente.'));
  } catch (error) {
    console.error('Error al actualizar orden:', error);
    res.redirect(`/job-orders/detail/${id}?error=` + encodeURIComponent('Error al actualizar la orden.'));
  }
};

// 7. Cambiar estado de una orden
export const changeOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { newStatus } = req.body;

  try {
    const order = await JobOrderModel.findByPk(id, {
      include: [
        { model: VehicleModel },
        { model: JobOrderPartModel },
        { model: JobOrderServiceModel }
      ]
    });

    if (!order) {
      return res.status(404).render('404', { title: 'Orden no encontrada' });
    }

    if (order.status === 'Entregada') {
      return res.redirect(`/job-orders/detail/${id}?error=` + encodeURIComponent('Una orden entregada no puede ser modificada.'));
    }
    if (order.status === 'Cancelada') {
      return res.redirect(`/job-orders/detail/${id}?error=` + encodeURIComponent('Una orden cancelada no puede ser modificada.'));
    }

    if (!ORDER_STATUSES.includes(newStatus)) {
      return res.redirect(`/job-orders/detail/${id}?error=` + encodeURIComponent('El estado seleccionado no es válido.'));
    }

    // Regla: No se puede entregar una orden sin al menos un servicio registrado
    if (newStatus === 'Entregada') {
      const servicesCount = (order.JobOrderServices || []).length;
      if (servicesCount === 0) {
        return res.redirect(`/job-orders/detail/${id}?error=` + encodeURIComponent('No se puede entregar una orden sin servicios registrados.'));
      }
      // Cambiar vehículo a 'Fuera del taller'
      await order.Vehicle.update({ status: 'Fuera del taller' });
    } else if (newStatus === 'Cancelada') {
      // Regla: Si una orden se cancela, el sistema debe devolver al inventario todas las piezas asociadas
      for (const item of order.JobOrderParts || []) {
        const part = await PartModel.findByPk(item.partId);
        if (part) {
          await part.increment('stockActual', { by: item.quantity });
        }
      }
      // Vehículo deja de mostrarse como ocupado por esa orden
      await order.Vehicle.update({ status: 'Fuera del taller' });
    } else if (ACTIVE_ORDER_STATUSES.includes(newStatus)) {
      // Vehículo debe mostrarse como En taller
      await order.Vehicle.update({ status: 'En taller' });
    }

    await order.update({ status: newStatus });
    res.redirect(`/job-orders/detail/${id}?success=` + encodeURIComponent(`El estado de la orden cambió a ${newStatus}.`));
  } catch (error) {
    console.error('Error al cambiar estado de la orden:', error);
    res.redirect(`/job-orders/detail/${id}?error=` + encodeURIComponent('Error al cambiar el estado de la orden.'));
  }
};

// 8. Cancelar orden
export const cancelJobOrder = async (req, res) => {
  const { id } = req.params;
  try {
    const order = await JobOrderModel.findByPk(id, {
      include: [
        { model: VehicleModel },
        { model: JobOrderPartModel }
      ]
    });

    if (!order) {
      return res.redirect('/job-orders?error=' + encodeURIComponent('La orden no existe.'));
    }

    if (order.status === 'Entregada') {
      return res.redirect(`/job-orders/detail/${id}?error=` + encodeURIComponent('No se puede cancelar una orden entregada.'));
    }

    if (order.status === 'Cancelada') {
      return res.redirect(`/job-orders/detail/${id}?error=` + encodeURIComponent('Una orden cancelada no puede ser modificada.'));
    }

    // Devolver repuestos al stock
    for (const item of order.JobOrderParts || []) {
      const part = await PartModel.findByPk(item.partId);
      if (part) {
        await part.increment('stockActual', { by: item.quantity });
      }
    }

    await order.update({ status: 'Cancelada' });
    await order.Vehicle.update({ status: 'Fuera del taller' });

    res.redirect(`/job-orders/detail/${id}?success=` + encodeURIComponent('La orden ha sido cancelada correctamente.'));
  } catch (error) {
    console.error('Error al cancelar orden:', error);
    res.redirect(`/job-orders/detail/${id}?error=` + encodeURIComponent('Error al cancelar la orden.'));
  }
};

// 9. Agregar servicio a la orden
export const addServiceToOrder = async (req, res) => {
  const { id } = req.params;
  try {
    const order = await JobOrderModel.findByPk(id);
    if (!order) {
      return res.status(404).render('404', { title: 'Orden no encontrada' });
    }

    if (order.status === 'Entregada' || order.status === 'Cancelada') {
      return res.redirect(`/job-orders/detail/${id}?error=` + encodeURIComponent('No se pueden agregar servicios si la orden es entregada o cancelada.'));
    }

    let { serviceId, appliedPrice, note } = req.body;
    note = (note || '').trim();
    const parsedPrice = parseFloat(appliedPrice);

    if (!serviceId) {
      return res.redirect(`/job-orders/detail/${id}?error=` + encodeURIComponent('Debe seleccionar un servicio.'));
    }

    const service = await ServiceModel.findByPk(serviceId);
    if (!service || service.status !== 'Activo') {
      return res.redirect(`/job-orders/detail/${id}?error=` + encodeURIComponent('El servicio seleccionado no está disponible.'));
    }

    // Regla: No se debe permitir agregar dos veces el mismo servicio a la misma orden
    const existing = await JobOrderServiceModel.findOne({
      where: { jobOrderId: id, serviceId }
    });
    if (existing) {
      return res.redirect(`/job-orders/detail/${id}?error=` + encodeURIComponent('Ese servicio ya fue agregado a la orden.'));
    }

    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      return res.redirect(`/job-orders/detail/${id}?error=` + encodeURIComponent('El precio aplicado debe ser mayor que cero.'));
    }

    await JobOrderServiceModel.create({
      jobOrderId: id,
      serviceId,
      appliedPrice: parsedPrice,
      note: note || null
    });

    await recalculateJobOrder(id);

    res.redirect(`/job-orders/detail/${id}?success=` + encodeURIComponent('Servicio agregado correctamente a la orden.'));
  } catch (error) {
    console.error('Error al agregar servicio a orden:', error);
    res.redirect(`/job-orders/detail/${id}?error=` + encodeURIComponent('Error al agregar servicio.'));
  }
};

// 10. Eliminar servicio de la orden
export const deleteServiceFromOrder = async (req, res) => {
  const { id, junctionId } = req.params;
  try {
    const order = await JobOrderModel.findByPk(id);
    if (!order) {
      return res.status(404).render('404', { title: 'Orden no encontrada' });
    }

    if (order.status === 'Entregada' || order.status === 'Cancelada') {
      return res.redirect(`/job-orders/detail/${id}?error=` + encodeURIComponent('No se pueden eliminar servicios si la orden es entregada o cancelada.'));
    }

    const item = await JobOrderServiceModel.findOne({
      where: { id: junctionId, jobOrderId: id }
    });

    if (item) {
      await item.destroy();
      await recalculateJobOrder(id);
    }

    res.redirect(`/job-orders/detail/${id}?success=` + encodeURIComponent('Servicio removido correctamente de la orden.'));
  } catch (error) {
    console.error('Error al remover servicio de la orden:', error);
    res.redirect(`/job-orders/detail/${id}?error=` + encodeURIComponent('Error al remover servicio.'));
  }
};

// 11. Agregar pieza/repuesto a la orden
export const addPartToOrder = async (req, res) => {
  const { id } = req.params;
  try {
    const order = await JobOrderModel.findByPk(id);
    if (!order) {
      return res.status(404).render('404', { title: 'Orden no encontrada' });
    }

    if (order.status === 'Entregada' || order.status === 'Cancelada') {
      return res.redirect(`/job-orders/detail/${id}?error=` + encodeURIComponent('No se pueden agregar piezas si la orden es entregada o cancelada.'));
    }

    let { partId, quantity, unitPriceApplied } = req.body;
    const parsedQty = parseInt(quantity, 10);
    const parsedPrice = parseFloat(unitPriceApplied);

    if (!partId) {
      return res.redirect(`/job-orders/detail/${id}?error=` + encodeURIComponent('Debe seleccionar una pieza.'));
    }

    const part = await PartModel.findByPk(partId);
    if (!part || part.status !== 'Activa') {
      return res.redirect(`/job-orders/detail/${id}?error=` + encodeURIComponent('La pieza seleccionada no está disponible.'));
    }

    if (isNaN(parsedQty) || parsedQty <= 0) {
      return res.redirect(`/job-orders/detail/${id}?error=` + encodeURIComponent('La cantidad debe ser mayor que cero.'));
    }

    // Regla: No se puede agregar una cantidad mayor al stock disponible
    if (parsedQty > part.stockActual) {
      return res.redirect(`/job-orders/detail/${id}?error=` + encodeURIComponent('No hay stock suficiente para agregar esa pieza.'));
    }

    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      return res.redirect(`/job-orders/detail/${id}?error=` + encodeURIComponent('El precio unitario debe ser mayor que cero.'));
    }

    const subtotal = parsedQty * parsedPrice;

    // Descontar del inventario
    await part.decrement('stockActual', { by: parsedQty });

    await JobOrderPartModel.create({
      jobOrderId: id,
      partId,
      quantity: parsedQty,
      unitPriceApplied: parsedPrice,
      subtotal
    });

    await recalculateJobOrder(id);

    res.redirect(`/job-orders/detail/${id}?success=` + encodeURIComponent('Pieza agregada correctamente a la orden.'));
  } catch (error) {
    console.error('Error al agregar pieza a orden:', error);
    res.redirect(`/job-orders/detail/${id}?error=` + encodeURIComponent('Error al agregar pieza.'));
  }
};

// 12. Eliminar pieza de la orden
export const deletePartFromOrder = async (req, res) => {
  const { id, junctionId } = req.params;
  try {
    const order = await JobOrderModel.findByPk(id);
    if (!order) {
      return res.status(404).render('404', { title: 'Orden no encontrada' });
    }

    if (order.status === 'Entregada' || order.status === 'Cancelada') {
      return res.redirect(`/job-orders/detail/${id}?error=` + encodeURIComponent('No se pueden eliminar piezas si la orden es entregada o cancelada.'));
    }

    const item = await JobOrderPartModel.findOne({
      where: { id: junctionId, jobOrderId: id }
    });

    if (item) {
      // Regla: Al eliminar una pieza de una orden, el sistema debe devolver la cantidad al stock
      const part = await PartModel.findByPk(item.partId);
      if (part) {
        await part.increment('stockActual', { by: item.quantity });
      }

      await item.destroy();
      await recalculateJobOrder(id);
    }

    res.redirect(`/job-orders/detail/${id}?success=` + encodeURIComponent('Pieza removida de la orden y reintegrada al stock.'));
  } catch (error) {
    console.error('Error al remover pieza de la orden:', error);
    res.redirect(`/job-orders/detail/${id}?error=` + encodeURIComponent('Error al remover pieza.'));
  }
};

// 13. Subir evidencia a la orden
export const uploadEvidence = async (req, res) => {
  const { id } = req.params;
  try {
    const order = await JobOrderModel.findByPk(id);
    if (!order) {
      return res.status(404).render('404', { title: 'Orden no encontrada' });
    }

    if (order.status === 'Entregada' || order.status === 'Cancelada') {
      return res.redirect(`/job-orders/detail/${id}?error=` + encodeURIComponent('No se pueden agregar evidencias si la orden es entregada o cancelada.'));
    }

    if (!req.file) {
      return res.redirect(`/job-orders/detail/${id}?error=` + encodeURIComponent('Debe seleccionar un archivo de imagen de evidencia.'));
    }

    const { description } = req.body;

    await EvidenceModel.create({
      jobOrderId: id,
      imagePath: `/uploads/${req.file.filename}`,
      description: (description || '').trim() || null
    });

    res.redirect(`/job-orders/detail/${id}?success=` + encodeURIComponent('Evidencia fotográfica cargada correctamente.'));
  } catch (error) {
    console.error('Error al subir evidencia:', error);
    res.redirect(`/job-orders/detail/${id}?error=` + encodeURIComponent('Error al subir la evidencia.'));
  }
};

// 14. Eliminar evidencia de la orden
export const deleteEvidence = async (req, res) => {
  const { id, evidenceId } = req.params;
  try {
    const order = await JobOrderModel.findByPk(id);
    if (!order) {
      return res.status(404).render('404', { title: 'Orden no encontrada' });
    }

    if (order.status === 'Entregada' || order.status === 'Cancelada') {
      return res.redirect(`/job-orders/detail/${id}?error=` + encodeURIComponent('No se pueden eliminar evidencias si la orden es entregada o cancelada.'));
    }

    const evidence = await EvidenceModel.findOne({
      where: { id: evidenceId, jobOrderId: id }
    });

    if (evidence) {
      const filePath = path.join(UPLOADS_DIR, path.basename(evidence.imagePath));
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
      }
      await evidence.destroy();
    }

    res.redirect(`/job-orders/detail/${id}?success=` + encodeURIComponent('Evidencia eliminada correctamente.'));
  } catch (error) {
    console.error('Error al eliminar evidencia:', error);
    res.redirect(`/job-orders/detail/${id}?error=` + encodeURIComponent('Error al eliminar evidencia.'));
  }
};

// 15. Actualizar parámetros financieros (descuento e impuestos)
export const updateOrderFinances = async (req, res) => {
  const { id } = req.params;
  try {
    const order = await JobOrderModel.findByPk(id);
    if (!order) {
      return res.status(404).render('404', { title: 'Orden no encontrada' });
    }

    if (order.status === 'Entregada' || order.status === 'Cancelada') {
      return res.redirect(`/job-orders/detail/${id}?error=` + encodeURIComponent('No se pueden modificar datos si la orden es entregada o cancelada.'));
    }

    let { discount, applyTax, taxPercentage } = req.body;
    let parsedDiscount = parseFloat(discount);
    if (isNaN(parsedDiscount)) parsedDiscount = 0;

    if (parsedDiscount < 0) {
      return res.redirect(`/job-orders/detail/${id}?error=` + encodeURIComponent('El descuento no puede ser menor que cero.'));
    }

    if (parsedDiscount > parseFloat(order.subtotalGeneral)) {
      return res.redirect(`/job-orders/detail/${id}?error=` + encodeURIComponent('El descuento no puede ser mayor que el subtotal general.'));
    }

    const isTaxApplied = applyTax === 'on' || applyTax === 'true' || applyTax === true;
    let parsedTax = parseFloat(taxPercentage);

    if (isTaxApplied) {
      if (taxPercentage === undefined || taxPercentage === '' || isNaN(parsedTax)) {
        return res.redirect(`/job-orders/detail/${id}?error=` + encodeURIComponent('El porcentaje de impuesto es requerido.'));
      }
      if (parsedTax < 0 || parsedTax > 100) {
        return res.redirect(`/job-orders/detail/${id}?error=` + encodeURIComponent('El porcentaje de impuesto debe estar entre 0 y 100.'));
      }
    } else {
      parsedTax = 0;
    }

    await order.update({
      discount: parsedDiscount,
      applyTax: isTaxApplied,
      taxPercentage: parsedTax
    });

    await recalculateJobOrder(id);

    res.redirect(`/job-orders/detail/${id}?success=` + encodeURIComponent('Resumen financiero actualizado correctamente.'));
  } catch (error) {
    console.error('Error al actualizar finanzas de orden:', error);
    res.redirect(`/job-orders/detail/${id}?error=` + encodeURIComponent('Error al actualizar finanzas.'));
  }
};
