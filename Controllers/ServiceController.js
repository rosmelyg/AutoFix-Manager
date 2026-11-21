import { ServiceModel } from '../models/ServiceModel.js';
import { JobOrderServiceModel } from '../models/JobOrderServiceModel.js';
import { JobOrderModel } from '../models/JobOrderModel.js';
import { Op } from 'sequelize';

const SERVICE_CATEGORIES = [
  'Diagnóstico',
  'Mantenimiento',
  'Reparación',
  'Electricidad',
  'Frenos',
  'Motor',
  'Transmisión',
  'Suspensión',
  'Aire acondicionado',
  'Otro'
];

const SERVICE_STATUSES = ['Activo', 'Inactivo'];

// Listar servicios con filtros
export const getServices = async (req, res) => {
  try {
    const { category, status } = req.query;
    const where = {};

    if (category) {
      where.category = category;
    }
    if (status) {
      where.status = status;
    }

    const services = await ServiceModel.findAll({
      where,
      order: [['name', 'ASC']]
    });

    res.render('services/index', {
      title: 'Gestión de Servicios',
      activeServices: true,
      services: services.map(s => s.toJSON()),
      categories: SERVICE_CATEGORIES,
      statuses: SERVICE_STATUSES,
      filters: { category, status },
      success: req.query.success || null,
      error: req.query.error || null
    });
  } catch (error) {
    console.error('Error al obtener servicios:', error);
    res.status(500).render('error', { message: 'No fue posible cargar el listado de servicios.' });
  }
};

// Formulario de creación
export const renderCreateService = (req, res) => {
  res.render('services/create', {
    title: 'Registrar Servicio',
    activeServices: true,
    categories: SERVICE_CATEGORIES,
    statuses: SERVICE_STATUSES,
    service: { status: 'Activo' }
  });
};

// Crear nuevo servicio
export const createService = async (req, res) => {
  try {
    let { name, description, category, basePrice, estimatedDurationMinutes, status } = req.body;
    name = (name || '').trim();
    description = (description || '').trim();
    category = (category || '').trim();
    status = (status || '').trim();
    const parsedPrice = parseFloat(basePrice);
    const parsedDuration = estimatedDurationMinutes ? parseInt(estimatedDurationMinutes, 10) : null;

    if (!name) {
      return res.render('services/create', {
        title: 'Registrar Servicio',
        activeServices: true,
        categories: SERVICE_CATEGORIES,
        statuses: SERVICE_STATUSES,
        error: 'El nombre del servicio es requerido.',
        service: req.body
      });
    }

    // Unicidad de nombre
    const existing = await ServiceModel.findOne({
      where: { name: { [Op.like]: name } }
    });
    if (existing && existing.name.toLowerCase() === name.toLowerCase()) {
      return res.render('services/create', {
        title: 'Registrar Servicio',
        activeServices: true,
        categories: SERVICE_CATEGORIES,
        statuses: SERVICE_STATUSES,
        error: 'Ya existe un servicio registrado con ese nombre.',
        service: req.body
      });
    }

    if (!category) {
      return res.render('services/create', {
        title: 'Registrar Servicio',
        activeServices: true,
        categories: SERVICE_CATEGORIES,
        statuses: SERVICE_STATUSES,
        error: 'La categoría del servicio es requerida.',
        service: req.body
      });
    }

    if (!SERVICE_CATEGORIES.includes(category)) {
      return res.render('services/create', {
        title: 'Registrar Servicio',
        activeServices: true,
        categories: SERVICE_CATEGORIES,
        statuses: SERVICE_STATUSES,
        error: 'La categoría seleccionada no es válida.',
        service: req.body
      });
    }

    if (basePrice === undefined || basePrice === '' || isNaN(parsedPrice)) {
      return res.render('services/create', {
        title: 'Registrar Servicio',
        activeServices: true,
        categories: SERVICE_CATEGORIES,
        statuses: SERVICE_STATUSES,
        error: 'El precio base es requerido.',
        service: req.body
      });
    }

    if (parsedPrice <= 0) {
      return res.render('services/create', {
        title: 'Registrar Servicio',
        activeServices: true,
        categories: SERVICE_CATEGORIES,
        statuses: SERVICE_STATUSES,
        error: 'El precio base debe ser mayor que cero.',
        service: req.body
      });
    }

    if (parsedDuration !== null && (isNaN(parsedDuration) || parsedDuration <= 0)) {
      return res.render('services/create', {
        title: 'Registrar Servicio',
        activeServices: true,
        categories: SERVICE_CATEGORIES,
        statuses: SERVICE_STATUSES,
        error: 'La duración estimada debe ser mayor que cero.',
        service: req.body
      });
    }

    if (!status || !SERVICE_STATUSES.includes(status)) {
      return res.render('services/create', {
        title: 'Registrar Servicio',
        activeServices: true,
        categories: SERVICE_CATEGORIES,
        statuses: SERVICE_STATUSES,
        error: 'El estado del servicio es requerido.',
        service: req.body
      });
    }

    await ServiceModel.create({
      name,
      description: description || null,
      category,
      basePrice: parsedPrice,
      estimatedDurationMinutes: parsedDuration,
      status
    });

    res.redirect('/services?success=' + encodeURIComponent('El servicio fue registrado correctamente.'));
  } catch (error) {
    console.error('Error al registrar servicio:', error);
    res.redirect('/services?error=' + encodeURIComponent('Error inesperado al registrar el servicio.'));
  }
};

// Formulario de edición
export const renderEditService = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await ServiceModel.findByPk(id);
    if (!service) {
      return res.status(404).render('404', { title: 'Servicio no encontrado' });
    }

    res.render('services/edit', {
      title: 'Editar Servicio',
      activeServices: true,
      service: service.toJSON(),
      categories: SERVICE_CATEGORIES,
      statuses: SERVICE_STATUSES
    });
  } catch (error) {
    console.error('Error al cargar servicio:', error);
    res.redirect('/services?error=' + encodeURIComponent('No fue posible cargar el servicio.'));
  }
};

// Actualizar servicio
export const updateService = async (req, res) => {
  const { id } = req.params;
  try {
    const service = await ServiceModel.findByPk(id);
    if (!service) {
      return res.status(404).render('404', { title: 'Servicio no encontrado' });
    }

    let { name, description, category, basePrice, estimatedDurationMinutes, status } = req.body;
    name = (name || '').trim();
    description = (description || '').trim();
    category = (category || '').trim();
    status = (status || '').trim();
    const parsedPrice = parseFloat(basePrice);
    const parsedDuration = estimatedDurationMinutes ? parseInt(estimatedDurationMinutes, 10) : null;

    if (!name) {
      return res.render('services/edit', {
        title: 'Editar Servicio',
        activeServices: true,
        categories: SERVICE_CATEGORIES,
        statuses: SERVICE_STATUSES,
        error: 'El nombre del servicio es requerido.',
        service: { id, ...req.body }
      });
    }

    const existing = await ServiceModel.findOne({
      where: {
        id: { [Op.ne]: id },
        name: { [Op.like]: name }
      }
    });
    if (existing && existing.name.toLowerCase() === name.toLowerCase()) {
      return res.render('services/edit', {
        title: 'Editar Servicio',
        activeServices: true,
        categories: SERVICE_CATEGORIES,
        statuses: SERVICE_STATUSES,
        error: 'Ya existe un servicio registrado con ese nombre.',
        service: { id, ...req.body }
      });
    }

    if (!category) {
      return res.render('services/edit', {
        title: 'Editar Servicio',
        activeServices: true,
        categories: SERVICE_CATEGORIES,
        statuses: SERVICE_STATUSES,
        error: 'La categoría del servicio es requerida.',
        service: { id, ...req.body }
      });
    }

    if (!SERVICE_CATEGORIES.includes(category)) {
      return res.render('services/edit', {
        title: 'Editar Servicio',
        activeServices: true,
        categories: SERVICE_CATEGORIES,
        statuses: SERVICE_STATUSES,
        error: 'La categoría seleccionada no es válida.',
        service: { id, ...req.body }
      });
    }

    if (basePrice === undefined || basePrice === '' || isNaN(parsedPrice)) {
      return res.render('services/edit', {
        title: 'Editar Servicio',
        activeServices: true,
        categories: SERVICE_CATEGORIES,
        statuses: SERVICE_STATUSES,
        error: 'El precio base es requerido.',
        service: { id, ...req.body }
      });
    }

    if (parsedPrice <= 0) {
      return res.render('services/edit', {
        title: 'Editar Servicio',
        activeServices: true,
        categories: SERVICE_CATEGORIES,
        statuses: SERVICE_STATUSES,
        error: 'El precio base debe ser mayor que cero.',
        service: { id, ...req.body }
      });
    }

    if (parsedDuration !== null && (isNaN(parsedDuration) || parsedDuration <= 0)) {
      return res.render('services/edit', {
        title: 'Editar Servicio',
        activeServices: true,
        categories: SERVICE_CATEGORIES,
        statuses: SERVICE_STATUSES,
        error: 'La duración estimada debe ser mayor que cero.',
        service: { id, ...req.body }
      });
    }

    if (!status || !SERVICE_STATUSES.includes(status)) {
      return res.render('services/edit', {
        title: 'Editar Servicio',
        activeServices: true,
        categories: SERVICE_CATEGORIES,
        statuses: SERVICE_STATUSES,
        error: 'El estado del servicio es requerido.',
        service: { id, ...req.body }
      });
    }

    await service.update({
      name,
      description: description || null,
      category,
      basePrice: parsedPrice,
      estimatedDurationMinutes: parsedDuration,
      status
    });

    res.redirect('/services?success=' + encodeURIComponent('El servicio fue actualizado correctamente.'));
  } catch (error) {
    console.error('Error al actualizar servicio:', error);
    res.redirect('/services?error=' + encodeURIComponent('Error al actualizar el servicio.'));
  }
};

// Detalle de servicio
export const getServiceDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await ServiceModel.findByPk(id);
    if (!service) {
      return res.status(404).render('404', { title: 'Servicio no encontrado' });
    }

    const usageCount = await JobOrderServiceModel.count({
      where: { serviceId: id }
    });

    res.render('services/detail', {
      title: `Detalle del Servicio: ${service.name}`,
      activeServices: true,
      service: service.toJSON(),
      usageCount
    });
  } catch (error) {
    console.error('Error al ver detalle del servicio:', error);
    res.redirect('/services?error=' + encodeURIComponent('No fue posible cargar el detalle del servicio.'));
  }
};

// Eliminar servicio
export const deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await ServiceModel.findByPk(id);
    if (!service) {
      return res.redirect('/services?error=' + encodeURIComponent('El servicio no existe.'));
    }

    // Regla: No se debe permitir eliminar un servicio si ya fue usado en una orden de trabajo.
    const usageCount = await JobOrderServiceModel.count({
      where: { serviceId: id }
    });

    if (usageCount > 0) {
      return res.redirect('/services?error=' + encodeURIComponent('No se puede eliminar porque ya fue usado en una orden de trabajo.'));
    }

    await service.destroy();
    res.redirect('/services?success=' + encodeURIComponent('El servicio fue eliminado correctamente.'));
  } catch (error) {
    console.error('Error al eliminar servicio:', error);
    res.redirect('/services?error=' + encodeURIComponent('Error al eliminar el servicio.'));
  }
};
