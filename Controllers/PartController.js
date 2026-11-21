import { PartModel } from '../models/PartModel.js';
import { JobOrderPartModel } from '../models/JobOrderPartModel.js';
import { Op } from 'sequelize';
import fs from 'fs';
import path from 'path';
import { UPLOADS_DIR } from '../utils/Paths.js';

const PART_CATEGORIES = [
  'Motor',
  'Frenos',
  'Suspensión',
  'Transmisión',
  'Electricidad',
  'Filtros',
  'Aceites y fluidos',
  'Neumáticos',
  'Accesorios',
  'Otro'
];

const PART_STATUSES = ['Activa', 'Inactiva'];


export const getParts = async (req, res) => {
  try {
    const { category, status, inventoryLevel } = req.query;
    const where = {};

    if (category) {
      where.category = category;
    }
    if (status) {
      where.status = status;
    }

    let parts = await PartModel.findAll({
      where,
      order: [['name', 'ASC']]
    });

    let formattedParts = parts.map(p => {
      const data = p.toJSON();
      data.isLowStock = data.stockActual <= data.stockMinimo;
      data.inventoryLevelText = data.isLowStock ? 'Bajo inventario' : 'Normal';
      return data;
    });

    // Filtrar por nivel de inventario en memoria si aplica
    if (inventoryLevel === 'low') {
      formattedParts = formattedParts.filter(p => p.isLowStock);
    } else if (inventoryLevel === 'normal') {
      formattedParts = formattedParts.filter(p => !p.isLowStock);
    }

    res.render('parts/index', {
      title: 'Gestión de Piezas e Inventario',
      activeParts: true,
      parts: formattedParts,
      categories: PART_CATEGORIES,
      statuses: PART_STATUSES,
      filters: { category, status, inventoryLevel },
      success: req.query.success || null,
      error: req.query.error || null
    });
  } catch (error) {
    console.error('Error al obtener piezas:', error);
    res.status(500).render('error', { message: 'No fue posible cargar el listado de repuestos.' });
  }
};

// Formulario de creación
export const renderCreatePart = (req, res) => {
  res.render('parts/create', {
    title: 'Registrar Pieza',
    activeParts: true,
    categories: PART_CATEGORIES,
    statuses: PART_STATUSES,
    part: { status: 'Activa', stockActual: 0, stockMinimo: 0, unitCost: 0.00, salePrice: 0.00 }
  });
};

// Crear nueva pieza
export const createPart = async (req, res) => {
  try {
    let { 
      code, 
      name, 
      description, 
      category, 
      stockActual, 
      stockMinimo, 
      unitCost, 
      salePrice, 
      status 
    } = req.body;

    code = (code || '').trim().toUpperCase();
    name = (name || '').trim();
    description = (description || '').trim();
    category = (category || '').trim();
    status = (status || '').trim();

    const parsedStock = parseInt(stockActual, 10);
    const parsedMinStock = parseInt(stockMinimo, 10);
    const parsedCost = parseFloat(unitCost);
    const parsedSale = parseFloat(salePrice);

    if (!code) {
      return res.render('parts/create', {
        title: 'Registrar Pieza',
        activeParts: true,
        categories: PART_CATEGORIES,
        statuses: PART_STATUSES,
        error: 'El código de la pieza es requerido.',
        part: req.body
      });
    }

    // Unicidad de código
    const existingCode = await PartModel.findOne({ where: { code } });
    if (existingCode) {
      return res.render('parts/create', {
        title: 'Registrar Pieza',
        activeParts: true,
        categories: PART_CATEGORIES,
        statuses: PART_STATUSES,
        error: 'Ya existe una pieza registrada con ese código.',
        part: req.body
      });
    }

    if (!name) {
      return res.render('parts/create', {
        title: 'Registrar Pieza',
        activeParts: true,
        categories: PART_CATEGORIES,
        statuses: PART_STATUSES,
        error: 'El nombre de la pieza es requerido.',
        part: req.body
      });
    }

    if (!category) {
      return res.render('parts/create', {
        title: 'Registrar Pieza',
        activeParts: true,
        categories: PART_CATEGORIES,
        statuses: PART_STATUSES,
        error: 'La categoría de la pieza es requerida.',
        part: req.body
      });
    }

    if (!PART_CATEGORIES.includes(category)) {
      return res.render('parts/create', {
        title: 'Registrar Pieza',
        activeParts: true,
        categories: PART_CATEGORIES,
        statuses: PART_STATUSES,
        error: 'La categoría seleccionada no es válida.',
        part: req.body
      });
    }

    if (isNaN(parsedStock) || parsedStock < 0) {
      return res.render('parts/create', {
        title: 'Registrar Pieza',
        activeParts: true,
        categories: PART_CATEGORIES,
        statuses: PART_STATUSES,
        error: 'El stock actual no puede ser menor que cero.',
        part: req.body
      });
    }

    if (isNaN(parsedMinStock) || parsedMinStock < 0) {
      return res.render('parts/create', {
        title: 'Registrar Pieza',
        activeParts: true,
        categories: PART_CATEGORIES,
        statuses: PART_STATUSES,
        error: 'El stock mínimo no puede ser menor que cero.',
        part: req.body
      });
    }

    if (isNaN(parsedCost) || parsedCost < 0) {
      return res.render('parts/create', {
        title: 'Registrar Pieza',
        activeParts: true,
        categories: PART_CATEGORIES,
        statuses: PART_STATUSES,
        error: 'El costo unitario no puede ser menor que cero.',
        part: req.body
      });
    }

    if (isNaN(parsedSale) || parsedSale <= 0) {
      return res.render('parts/create', {
        title: 'Registrar Pieza',
        activeParts: true,
        categories: PART_CATEGORIES,
        statuses: PART_STATUSES,
        error: 'El precio de venta debe ser mayor que cero.',
        part: req.body
      });
    }

    if (parsedSale < parsedCost) {
      return res.render('parts/create', {
        title: 'Registrar Pieza',
        activeParts: true,
        categories: PART_CATEGORIES,
        statuses: PART_STATUSES,
        error: 'El precio de venta no puede ser menor que el costo unitario.',
        part: req.body
      });
    }

    if (!status || !PART_STATUSES.includes(status)) {
      return res.render('parts/create', {
        title: 'Registrar Pieza',
        activeParts: true,
        categories: PART_CATEGORIES,
        statuses: PART_STATUSES,
        error: 'El estado de la pieza es requerido.',
        part: req.body
      });
    }

    const image = req.file ? `/uploads/${req.file.filename}` : null;

    await PartModel.create({
      code,
      name,
      description: description || null,
      category,
      stockActual: parsedStock,
      stockMinimo: parsedMinStock,
      unitCost: parsedCost,
      salePrice: parsedSale,
      image,
      status
    });

    res.redirect('/parts?success=' + encodeURIComponent('La pieza fue registrada correctamente.'));
  } catch (error) {
    console.error('Error al registrar pieza:', error);
    res.redirect('/parts?error=' + encodeURIComponent('Error inesperado al registrar la pieza.'));
  }
};

// Formulario de edición
export const renderEditPart = async (req, res) => {
  try {
    const { id } = req.params;
    const part = await PartModel.findByPk(id);
    if (!part) {
      return res.status(404).render('404', { title: 'Pieza no encontrada' });
    }

    res.render('parts/edit', {
      title: 'Editar Pieza',
      activeParts: true,
      part: part.toJSON(),
      categories: PART_CATEGORIES,
      statuses: PART_STATUSES
    });
  } catch (error) {
    console.error('Error al cargar pieza para editar:', error);
    res.redirect('/parts?error=' + encodeURIComponent('No fue posible cargar la pieza.'));
  }
};

// Actualizar pieza
export const updatePart = async (req, res) => {
  const { id } = req.params;
  try {
    const part = await PartModel.findByPk(id);
    if (!part) {
      return res.status(404).render('404', { title: 'Pieza no encontrada' });
    }

    let { 
      code, 
      name, 
      description, 
      category, 
      stockActual, 
      stockMinimo, 
      unitCost, 
      salePrice, 
      status 
    } = req.body;

    code = (code || '').trim().toUpperCase();
    name = (name || '').trim();
    description = (description || '').trim();
    category = (category || '').trim();
    status = (status || '').trim();

    const parsedStock = parseInt(stockActual, 10);
    const parsedMinStock = parseInt(stockMinimo, 10);
    const parsedCost = parseFloat(unitCost);
    const parsedSale = parseFloat(salePrice);

    if (!code) {
      return res.render('parts/edit', {
        title: 'Editar Pieza',
        activeParts: true,
        categories: PART_CATEGORIES,
        statuses: PART_STATUSES,
        error: 'El código de la pieza es requerido.',
        part: { id, ...req.body, image: part.image }
      });
    }

    // Unicidad excluyendo el registro actual
    const existingCode = await PartModel.findOne({
      where: {
        id: { [Op.ne]: id },
        code
      }
    });
    if (existingCode) {
      return res.render('parts/edit', {
        title: 'Editar Pieza',
        activeParts: true,
        categories: PART_CATEGORIES,
        statuses: PART_STATUSES,
        error: 'Ya existe una pieza registrada con ese código.',
        part: { id, ...req.body, image: part.image }
      });
    }

    if (!name) {
      return res.render('parts/edit', {
        title: 'Editar Pieza',
        activeParts: true,
        categories: PART_CATEGORIES,
        statuses: PART_STATUSES,
        error: 'El nombre de la pieza es requerido.',
        part: { id, ...req.body, image: part.image }
      });
    }

    if (!category) {
      return res.render('parts/edit', {
        title: 'Editar Pieza',
        activeParts: true,
        categories: PART_CATEGORIES,
        statuses: PART_STATUSES,
        error: 'La categoría de la pieza es requerida.',
        part: { id, ...req.body, image: part.image }
      });
    }

    if (!PART_CATEGORIES.includes(category)) {
      return res.render('parts/edit', {
        title: 'Editar Pieza',
        activeParts: true,
        categories: PART_CATEGORIES,
        statuses: PART_STATUSES,
        error: 'La categoría seleccionada no es válida.',
        part: { id, ...req.body, image: part.image }
      });
    }

    if (isNaN(parsedStock) || parsedStock < 0) {
      return res.render('parts/edit', {
        title: 'Editar Pieza',
        activeParts: true,
        categories: PART_CATEGORIES,
        statuses: PART_STATUSES,
        error: 'El stock actual no puede ser menor que cero.',
        part: { id, ...req.body, image: part.image }
      });
    }

    if (isNaN(parsedMinStock) || parsedMinStock < 0) {
      return res.render('parts/edit', {
        title: 'Editar Pieza',
        activeParts: true,
        categories: PART_CATEGORIES,
        statuses: PART_STATUSES,
        error: 'El stock mínimo no puede ser menor que cero.',
        part: { id, ...req.body, image: part.image }
      });
    }

    if (isNaN(parsedCost) || parsedCost < 0) {
      return res.render('parts/edit', {
        title: 'Editar Pieza',
        activeParts: true,
        categories: PART_CATEGORIES,
        statuses: PART_STATUSES,
        error: 'El costo unitario no puede ser menor que cero.',
        part: { id, ...req.body, image: part.image }
      });
    }

    if (isNaN(parsedSale) || parsedSale <= 0) {
      return res.render('parts/edit', {
        title: 'Editar Pieza',
        activeParts: true,
        categories: PART_CATEGORIES,
        statuses: PART_STATUSES,
        error: 'El precio de venta debe ser mayor que cero.',
        part: { id, ...req.body, image: part.image }
      });
    }

    if (parsedSale < parsedCost) {
      return res.render('parts/edit', {
        title: 'Editar Pieza',
        activeParts: true,
        categories: PART_CATEGORIES,
        statuses: PART_STATUSES,
        error: 'El precio de venta no puede ser menor que el costo unitario.',
        part: { id, ...req.body, image: part.image }
      });
    }

    if (!status || !PART_STATUSES.includes(status)) {
      return res.render('parts/edit', {
        title: 'Editar Pieza',
        activeParts: true,
        categories: PART_CATEGORIES,
        statuses: PART_STATUSES,
        error: 'El estado de la pieza es requerido.',
        part: { id, ...req.body, image: part.image }
      });
    }

    let image = part.image;
    if (req.file) {
      if (part.image) {
        const oldPath = path.join(UPLOADS_DIR, path.basename(part.image));
        if (fs.existsSync(oldPath)) {
          try { fs.unlinkSync(oldPath); } catch (e) { /* ignore */ }
        }
      }
      image = `/uploads/${req.file.filename}`;
    }

    await part.update({
      code,
      name,
      description: description || null,
      category,
      stockActual: parsedStock,
      stockMinimo: parsedMinStock,
      unitCost: parsedCost,
      salePrice: parsedSale,
      image,
      status
    });

    res.redirect('/parts?success=' + encodeURIComponent('La pieza fue actualizada correctamente.'));
  } catch (error) {
    console.error('Error al actualizar pieza:', error);
    res.redirect('/parts?error=' + encodeURIComponent('Error al actualizar la pieza.'));
  }
};

// Detalle de pieza
export const getPartDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const part = await PartModel.findByPk(id);
    if (!part) {
      return res.status(404).render('404', { title: 'Pieza no encontrada' });
    }

    const usageCount = await JobOrderPartModel.count({
      where: { partId: id }
    });

    const data = part.toJSON();
    data.isLowStock = data.stockActual <= data.stockMinimo;
    data.inventoryLevelText = data.isLowStock ? 'Bajo inventario' : 'Normal';

    res.render('parts/detail', {
      title: `Detalle de Pieza: ${data.name}`,
      activeParts: true,
      part: data,
      usageCount
    });
  } catch (error) {
    console.error('Error al ver detalle de la pieza:', error);
    res.redirect('/parts?error=' + encodeURIComponent('No fue posible cargar el detalle de la pieza.'));
  }
};

// Eliminar pieza
export const deletePart = async (req, res) => {
  try {
    const { id } = req.params;
    const part = await PartModel.findByPk(id);
    if (!part) {
      return res.redirect('/parts?error=' + encodeURIComponent('La pieza no existe.'));
    }

    // Regla: No se debe permitir eliminar una pieza si ya fue usada en una orden de trabajo.
    const usageCount = await JobOrderPartModel.count({
      where: { partId: id }
    });

    if (usageCount > 0) {
      return res.redirect('/parts?error=' + encodeURIComponent('No se puede eliminar porque ya fue usada en una orden de trabajo.'));
    }

    if (part.image) {
      const imgPath = path.join(UPLOADS_DIR, path.basename(part.image));
      if (fs.existsSync(imgPath)) {
        try { fs.unlinkSync(imgPath); } catch (e) { /* ignore */ }
      }
    }

    await part.destroy();
    res.redirect('/parts?success=' + encodeURIComponent('La pieza fue eliminada correctamente.'));
  } catch (error) {
    console.error('Error al eliminar pieza:', error);
    res.redirect('/parts?error=' + encodeURIComponent('Error al eliminar la pieza.'));
  }
};
