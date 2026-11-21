import { VehicleModel } from '../models/VehicleModel.js';
import { BrandModel } from '../models/BrandModel.js';
import { JobOrderModel } from '../models/JobOrderModel.js';
import { Op } from 'sequelize';
import fs from 'fs';
import path from 'path';
import { UPLOADS_DIR } from '../utils/Paths.js';

const VEHICLE_TYPES = ['Carro', 'Jeepeta', 'Camioneta', 'Camión', 'Motocicleta', 'Otro'];
const VEHICLE_STATUSES = ['Registrado', 'En taller', 'Fuera del taller', 'Inactivo'];

// Listar vehículos con filtros
export const getVehicles = async (req, res) => {
  try {
    const { brandId, status, plate } = req.query;
    const where = {};

    if (brandId) {
      where.brandId = brandId;
    }
    if (status) {
      where.status = status;
    }
    if (plate && plate.trim()) {
      where.plate = { [Op.like]: `%${plate.trim().toUpperCase()}%` };
    }

    const vehicles = await VehicleModel.findAll({
      where,
      include: [{ model: BrandModel }],
      order: [['createdAt', 'DESC']]
    });

    const brands = await BrandModel.findAll({ order: [['name', 'ASC']] });

    res.render('vehicles/index', {
      title: 'Gestión de Vehículos',
      activeVehicles: true,
      vehicles: vehicles.map(v => v.toJSON()),
      brands: brands.map(b => b.toJSON()),
      filters: { brandId, status, plate },
      vehicleStatuses: VEHICLE_STATUSES,
      success: req.query.success || null,
      error: req.query.error || null
    });
  } catch (error) {
    console.error('Error al obtener vehículos:', error);
    res.status(500).render('error', { message: 'No fue posible cargar el listado de vehículos.' });
  }
};

// Formulario de creación de vehículo
export const renderCreateVehicle = async (req, res) => {
  try {
    // Solo marcas activas
    const brands = await BrandModel.findAll({ 
      where: { status: 'Activa' },
      order: [['name', 'ASC']]
    });

    res.render('vehicles/create', {
      title: 'Registrar Vehículo',
      activeVehicles: true,
      brands: brands.map(b => b.toJSON()),
      vehicleTypes: VEHICLE_TYPES,
      vehicleStatuses: VEHICLE_STATUSES,
      vehicle: { status: 'Registrado' }
    });
  } catch (error) {
    console.error('Error al cargar formulario de vehículo:', error);
    res.redirect('/vehicles?error=' + encodeURIComponent('Error al cargar formulario.'));
  }
};

// Crear nuevo vehículo
export const createVehicle = async (req, res) => {
  try {
    let { 
      plate, 
      brandId, 
      model, 
      year, 
      color, 
      vehicleType, 
      ownerName, 
      ownerPhone, 
      ownerEmail, 
      currentMileage, 
      status 
    } = req.body;

    plate = (plate || '').trim().toUpperCase();
    model = (model || '').trim();
    color = (color || '').trim();
    ownerName = (ownerName || '').trim();
    ownerPhone = (ownerPhone || '').trim();
    ownerEmail = (ownerEmail || '').trim();
    const parsedYear = parseInt(year, 10);
    const parsedMileage = parseFloat(currentMileage);
    const currentYear = new Date().getFullYear();

    const loadFormBrands = async () => {
      const b = await BrandModel.findAll({ where: { status: 'Activa' }, order: [['name', 'ASC']] });
      return b.map(x => x.toJSON());
    };

    if (!plate) {
      return res.render('vehicles/create', {
        title: 'Registrar Vehículo',
        activeVehicles: true,
        brands: await loadFormBrands(),
        vehicleTypes: VEHICLE_TYPES,
        error: 'La placa es requerida.',
        vehicle: req.body
      });
    }

    // Verificar placa duplicada
    const existingPlate = await VehicleModel.findOne({ where: { plate } });
    if (existingPlate) {
      return res.render('vehicles/create', {
        title: 'Registrar Vehículo',
        activeVehicles: true,
        brands: await loadFormBrands(),
        vehicleTypes: VEHICLE_TYPES,
        error: 'Ya existe un vehículo registrado con esa placa.',
        vehicle: req.body
      });
    }

    if (!brandId) {
      return res.render('vehicles/create', {
        title: 'Registrar Vehículo',
        activeVehicles: true,
        brands: await loadFormBrands(),
        vehicleTypes: VEHICLE_TYPES,
        error: 'La marca es requerida.',
        vehicle: req.body
      });
    }

    const brand = await BrandModel.findByPk(brandId);
    if (!brand || brand.status !== 'Activa') {
      return res.render('vehicles/create', {
        title: 'Registrar Vehículo',
        activeVehicles: true,
        brands: await loadFormBrands(),
        vehicleTypes: VEHICLE_TYPES,
        error: 'La marca seleccionada no está disponible.',
        vehicle: req.body
      });
    }

    if (!model) {
      return res.render('vehicles/create', {
        title: 'Registrar Vehículo',
        activeVehicles: true,
        brands: await loadFormBrands(),
        vehicleTypes: VEHICLE_TYPES,
        error: 'El modelo es requerido.',
        vehicle: req.body
      });
    }

    if (isNaN(parsedYear) || parsedYear < 1980 || parsedYear > currentYear + 1) {
      return res.render('vehicles/create', {
        title: 'Registrar Vehículo',
        activeVehicles: true,
        brands: await loadFormBrands(),
        vehicleTypes: VEHICLE_TYPES,
        error: 'El año del vehículo no es válido.',
        vehicle: req.body
      });
    }

    if (!color) {
      return res.render('vehicles/create', {
        title: 'Registrar Vehículo',
        activeVehicles: true,
        brands: await loadFormBrands(),
        vehicleTypes: VEHICLE_TYPES,
        error: 'El color es requerido.',
        vehicle: req.body
      });
    }

    if (!vehicleType || !VEHICLE_TYPES.includes(vehicleType)) {
      return res.render('vehicles/create', {
        title: 'Registrar Vehículo',
        activeVehicles: true,
        brands: await loadFormBrands(),
        vehicleTypes: VEHICLE_TYPES,
        error: 'El tipo de vehículo es requerido.',
        vehicle: req.body
      });
    }

    if (!ownerName) {
      return res.render('vehicles/create', {
        title: 'Registrar Vehículo',
        activeVehicles: true,
        brands: await loadFormBrands(),
        vehicleTypes: VEHICLE_TYPES,
        error: 'El nombre del propietario es requerido.',
        vehicle: req.body
      });
    }

    if (!ownerPhone) {
      return res.render('vehicles/create', {
        title: 'Registrar Vehículo',
        activeVehicles: true,
        brands: await loadFormBrands(),
        vehicleTypes: VEHICLE_TYPES,
        error: 'El teléfono del propietario es requerido.',
        vehicle: req.body
      });
    }

    if (ownerEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(ownerEmail)) {
        return res.render('vehicles/create', {
          title: 'Registrar Vehículo',
          activeVehicles: true,
          brands: await loadFormBrands(),
          vehicleTypes: VEHICLE_TYPES,
          error: 'El correo electrónico no es válido.',
          vehicle: req.body
        });
      }
    }

    if (isNaN(parsedMileage) || parsedMileage < 0) {
      return res.render('vehicles/create', {
        title: 'Registrar Vehículo',
        activeVehicles: true,
        brands: await loadFormBrands(),
        vehicleTypes: VEHICLE_TYPES,
        error: 'El kilometraje actual no puede ser menor que cero.',
        vehicle: req.body
      });
    }

    const image = req.file ? `/uploads/${req.file.filename}` : null;

    await VehicleModel.create({
      plate,
      brandId,
      model,
      year: parsedYear,
      color,
      vehicleType,
      ownerName,
      ownerPhone,
      ownerEmail: ownerEmail || null,
      currentMileage: parsedMileage,
      image,
      status: 'Registrado'
    });

    res.redirect('/vehicles?success=' + encodeURIComponent('El vehículo fue registrado correctamente.'));
  } catch (error) {
    console.error('Error al crear vehículo:', error);
    res.redirect('/vehicles?error=' + encodeURIComponent('Error inesperado al registrar el vehículo.'));
  }
};

// Formulario de edición de vehículo
export const renderEditVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const vehicle = await VehicleModel.findByPk(id, { include: [BrandModel] });
    if (!vehicle) {
      return res.status(404).render('404', { title: 'Vehículo no encontrado' });
    }

    // Marcas activas (o la marca actual si ya estaba asignada)
    const brands = await BrandModel.findAll({
      where: {
        [Op.or]: [
          { status: 'Activa' },
          { id: vehicle.brandId }
        ]
      },
      order: [['name', 'ASC']]
    });

    res.render('vehicles/edit', {
      title: 'Editar Vehículo',
      activeVehicles: true,
      vehicle: vehicle.toJSON(),
      brands: brands.map(b => b.toJSON()),
      vehicleTypes: VEHICLE_TYPES,
      vehicleStatuses: VEHICLE_STATUSES
    });
  } catch (error) {
    console.error('Error al cargar edición de vehículo:', error);
    res.redirect('/vehicles?error=' + encodeURIComponent('No fue posible cargar el vehículo.'));
  }
};

// Actualizar vehículo
export const updateVehicle = async (req, res) => {
  const { id } = req.params;
  try {
    const vehicle = await VehicleModel.findByPk(id);
    if (!vehicle) {
      return res.status(404).render('404', { title: 'Vehículo no encontrado' });
    }

    let { 
      plate, 
      brandId, 
      model, 
      year, 
      color, 
      vehicleType, 
      ownerName, 
      ownerPhone, 
      ownerEmail, 
      currentMileage, 
      status 
    } = req.body;

    plate = (plate || '').trim().toUpperCase();
    model = (model || '').trim();
    color = (color || '').trim();
    ownerName = (ownerName || '').trim();
    ownerPhone = (ownerPhone || '').trim();
    ownerEmail = (ownerEmail || '').trim();
    const parsedYear = parseInt(year, 10);
    const parsedMileage = parseFloat(currentMileage);
    const currentYear = new Date().getFullYear();

    const loadFormBrands = async () => {
      const b = await BrandModel.findAll({
        where: { [Op.or]: [{ status: 'Activa' }, { id: vehicle.brandId }] },
        order: [['name', 'ASC']]
      });
      return b.map(x => x.toJSON());
    };

    if (!plate) {
      return res.render('vehicles/edit', {
        title: 'Editar Vehículo',
        activeVehicles: true,
        brands: await loadFormBrands(),
        vehicleTypes: VEHICLE_TYPES,
        vehicleStatuses: VEHICLE_STATUSES,
        error: 'La placa es requerida.',
        vehicle: { id, ...req.body, image: vehicle.image }
      });
    }

    // Placa duplicada con otro vehículo
    const existingPlate = await VehicleModel.findOne({
      where: {
        id: { [Op.ne]: id },
        plate
      }
    });
    if (existingPlate) {
      return res.render('vehicles/edit', {
        title: 'Editar Vehículo',
        activeVehicles: true,
        brands: await loadFormBrands(),
        vehicleTypes: VEHICLE_TYPES,
        vehicleStatuses: VEHICLE_STATUSES,
        error: 'Ya existe un vehículo registrado con esa placa.',
        vehicle: { id, ...req.body, image: vehicle.image }
      });
    }

    if (!brandId) {
      return res.render('vehicles/edit', {
        title: 'Editar Vehículo',
        activeVehicles: true,
        brands: await loadFormBrands(),
        vehicleTypes: VEHICLE_TYPES,
        vehicleStatuses: VEHICLE_STATUSES,
        error: 'La marca es requerida.',
        vehicle: { id, ...req.body, image: vehicle.image }
      });
    }

    // Si cambió de marca, debe ser activa
    if (parseInt(brandId, 10) !== vehicle.brandId) {
      const brand = await BrandModel.findByPk(brandId);
      if (!brand || brand.status !== 'Activa') {
        return res.render('vehicles/edit', {
          title: 'Editar Vehículo',
          activeVehicles: true,
          brands: await loadFormBrands(),
          vehicleTypes: VEHICLE_TYPES,
          vehicleStatuses: VEHICLE_STATUSES,
          error: 'La marca seleccionada no está disponible.',
          vehicle: { id, ...req.body, image: vehicle.image }
        });
      }
    }

    if (!model) {
      return res.render('vehicles/edit', {
        title: 'Editar Vehículo',
        activeVehicles: true,
        brands: await loadFormBrands(),
        vehicleTypes: VEHICLE_TYPES,
        vehicleStatuses: VEHICLE_STATUSES,
        error: 'El modelo es requerido.',
        vehicle: { id, ...req.body, image: vehicle.image }
      });
    }

    if (isNaN(parsedYear) || parsedYear < 1980 || parsedYear > currentYear + 1) {
      return res.render('vehicles/edit', {
        title: 'Editar Vehículo',
        activeVehicles: true,
        brands: await loadFormBrands(),
        vehicleTypes: VEHICLE_TYPES,
        vehicleStatuses: VEHICLE_STATUSES,
        error: 'El año del vehículo no es válido.',
        vehicle: { id, ...req.body, image: vehicle.image }
      });
    }

    if (!color) {
      return res.render('vehicles/edit', {
        title: 'Editar Vehículo',
        activeVehicles: true,
        brands: await loadFormBrands(),
        vehicleTypes: VEHICLE_TYPES,
        vehicleStatuses: VEHICLE_STATUSES,
        error: 'El color es requerido.',
        vehicle: { id, ...req.body, image: vehicle.image }
      });
    }

    if (!vehicleType || !VEHICLE_TYPES.includes(vehicleType)) {
      return res.render('vehicles/edit', {
        title: 'Editar Vehículo',
        activeVehicles: true,
        brands: await loadFormBrands(),
        vehicleTypes: VEHICLE_TYPES,
        vehicleStatuses: VEHICLE_STATUSES,
        error: 'El tipo de vehículo es requerido.',
        vehicle: { id, ...req.body, image: vehicle.image }
      });
    }

    if (!ownerName) {
      return res.render('vehicles/edit', {
        title: 'Editar Vehículo',
        activeVehicles: true,
        brands: await loadFormBrands(),
        vehicleTypes: VEHICLE_TYPES,
        vehicleStatuses: VEHICLE_STATUSES,
        error: 'El nombre del propietario es requerido.',
        vehicle: { id, ...req.body, image: vehicle.image }
      });
    }

    if (!ownerPhone) {
      return res.render('vehicles/edit', {
        title: 'Editar Vehículo',
        activeVehicles: true,
        brands: await loadFormBrands(),
        vehicleTypes: VEHICLE_TYPES,
        vehicleStatuses: VEHICLE_STATUSES,
        error: 'El teléfono del propietario es requerido.',
        vehicle: { id, ...req.body, image: vehicle.image }
      });
    }

    if (ownerEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(ownerEmail)) {
        return res.render('vehicles/edit', {
          title: 'Editar Vehículo',
          activeVehicles: true,
          brands: await loadFormBrands(),
          vehicleTypes: VEHICLE_TYPES,
          vehicleStatuses: VEHICLE_STATUSES,
          error: 'El correo electrónico no es válido.',
          vehicle: { id, ...req.body, image: vehicle.image }
        });
      }
    }

    if (isNaN(parsedMileage) || parsedMileage < 0) {
      return res.render('vehicles/edit', {
        title: 'Editar Vehículo',
        activeVehicles: true,
        brands: await loadFormBrands(),
        vehicleTypes: VEHICLE_TYPES,
        vehicleStatuses: VEHICLE_STATUSES,
        error: 'El kilometraje actual no puede ser menor que cero.',
        vehicle: { id, ...req.body, image: vehicle.image }
      });
    }

    // Regla de estado: si tiene orden activa en taller, no cambiar a Fuera del taller o Inactivo
    const hasActiveOrder = await JobOrderModel.findOne({
      where: {
        vehicleId: id,
        status: { [Op.in]: ['Recibida', 'En diagnóstico', 'En reparación', 'Esperando piezas', 'Lista para entrega'] }
      }
    });

    if (hasActiveOrder && (status === 'Fuera del taller' || status === 'Inactivo')) {
      return res.render('vehicles/edit', {
        title: 'Editar Vehículo',
        activeVehicles: true,
        brands: await loadFormBrands(),
        vehicleTypes: VEHICLE_TYPES,
        vehicleStatuses: VEHICLE_STATUSES,
        error: 'El vehículo tiene una orden activa en proceso; no puede cambiarse a Fuera del taller ni Inactivo.',
        vehicle: { id, ...req.body, image: vehicle.image }
      });
    }

    // Manejo de imagen
    let image = vehicle.image;
    if (req.file) {
      // Si ya existía una imagen anterior, eliminarla de disco
      if (vehicle.image) {
        const oldPath = path.join(UPLOADS_DIR, path.basename(vehicle.image));
        if (fs.existsSync(oldPath)) {
          try { fs.unlinkSync(oldPath); } catch (e) { /* ignore */ }
        }
      }
      image = `/uploads/${req.file.filename}`;
    }

    await vehicle.update({
      plate,
      brandId,
      model,
      year: parsedYear,
      color,
      vehicleType,
      ownerName,
      ownerPhone,
      ownerEmail: ownerEmail || null,
      currentMileage: parsedMileage,
      image,
      status: status || vehicle.status
    });

    res.redirect('/vehicles?success=' + encodeURIComponent('El vehículo fue actualizado correctamente.'));
  } catch (error) {
    console.error('Error al actualizar vehículo:', error);
    res.redirect('/vehicles?error=' + encodeURIComponent('Error al actualizar el vehículo.'));
  }
};

// Detalle de un vehículo
export const getVehicleDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const vehicle = await VehicleModel.findByPk(id, {
      include: [
        { model: BrandModel },
        { model: JobOrderModel }
      ]
    });

    if (!vehicle) {
      return res.status(404).render('404', { title: 'Vehículo no encontrado' });
    }

    const data = vehicle.toJSON();
    data.orderCount = data.JobOrders ? data.JobOrders.length : 0;

    res.render('vehicles/detail', {
      title: `Detalle del Vehículo: ${data.plate}`,
      activeVehicles: true,
      vehicle: data
    });
  } catch (error) {
    console.error('Error al ver detalle del vehículo:', error);
    res.redirect('/vehicles?error=' + encodeURIComponent('No fue posible cargar el detalle del vehículo.'));
  }
};

// Eliminar vehículo
export const deleteVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const vehicle = await VehicleModel.findByPk(id, {
      include: [{ model: JobOrderModel, attributes: ['id'] }]
    });

    if (!vehicle) {
      return res.redirect('/vehicles?error=' + encodeURIComponent('El vehículo no existe.'));
    }

    // Regla: No se debe permitir eliminar un vehículo si tiene órdenes de trabajo asociadas.
    if (vehicle.JobOrders && vehicle.JobOrders.length > 0) {
      return res.redirect('/vehicles?error=' + encodeURIComponent('No se puede eliminar porque tiene órdenes de trabajo registradas.'));
    }

    // Eliminar imagen asociada si existe
    if (vehicle.image) {
      const imgPath = path.join(UPLOADS_DIR, path.basename(vehicle.image));
      if (fs.existsSync(imgPath)) {
        try { fs.unlinkSync(imgPath); } catch (e) { /* ignore */ }
      }
    }

    await vehicle.destroy();
    res.redirect('/vehicles?success=' + encodeURIComponent('El vehículo fue eliminado correctamente.'));
  } catch (error) {
    console.error('Error al eliminar vehículo:', error);
    res.redirect('/vehicles?error=' + encodeURIComponent('Error al eliminar el vehículo.'));
  }
};
