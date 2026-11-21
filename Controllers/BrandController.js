import { BrandModel } from '../models/BrandModel.js';
import { VehicleModel } from '../models/VehicleModel.js';
import { Op } from 'sequelize';

// Listar marcas
export const getBrands = async (req, res) => {
  try {
    const brands = await BrandModel.findAll({
      include: [{ model: VehicleModel, attributes: ['id'] }],
      order: [['name', 'ASC']]
    });

    const formattedBrands = brands.map(b => {
      const data = b.toJSON();
      return {
        ...data,
        vehicleCount: data.Vehicles ? data.Vehicles.length : 0
      };
    });

    res.render('brands/index', { 
      title: 'Gestión de Marcas', 
      brands: formattedBrands,
      activeBrands: true,
      success: req.query.success || null,
      error: req.query.error || null
    });
  } catch (error) {
    console.error('Error al obtener las marcas:', error);
    res.status(500).render('error', { message: 'No fue posible cargar el listado de marcas.' });
  }
};

// Formulario para crear marca
export const renderCreateBrand = (req, res) => {
  res.render('brands/create', { 
    title: 'Nueva Marca',
    activeBrands: true,
    brand: { status: 'Activa' }
  });
};

// Guardar nueva marca
export const createBrand = async (req, res) => {
  try {
    let { name, originCountry, status } = req.body;
    name = (name || '').trim();
    originCountry = (originCountry || '').trim();
    status = (status || '').trim();

    if (!name) {
      return res.render('brands/create', {
        title: 'Nueva Marca',
        activeBrands: true,
        error: 'El nombre de la marca es requerido.',
        brand: { name, originCountry, status: status || 'Activa' }
      });
    }

    if (!status) {
      return res.render('brands/create', {
        title: 'Nueva Marca',
        activeBrands: true,
        error: 'El estado de la marca es requerido.',
        brand: { name, originCountry, status: 'Activa' }
      });
    }

    if (status !== 'Activa' && status !== 'Inactiva') {
      return res.render('brands/create', {
        title: 'Nueva Marca',
        activeBrands: true,
        error: 'El estado seleccionado no es válido.',
        brand: { name, originCountry, status: 'Activa' }
      });
    }

    // Comprobar duplicidad de nombre (insensible a mayúsculas/minúsculas)
    const existing = await BrandModel.findOne({
      where: {
        name: { [Op.like]: name }
      }
    });

    if (existing && existing.name.toLowerCase() === name.toLowerCase()) {
      return res.render('brands/create', {
        title: 'Nueva Marca',
        activeBrands: true,
        error: 'Ya existe una marca registrada con ese nombre.',
        brand: { name, originCountry, status }
      });
    }

    await BrandModel.create({
      name,
      originCountry: originCountry || null,
      status
    });

    res.redirect('/brands?success=' + encodeURIComponent('La marca fue registrada correctamente.'));
  } catch (error) {
    console.error('Error al crear la marca:', error);
    res.render('brands/create', { 
      title: 'Nueva Marca', 
      activeBrands: true,
      error: 'Error al registrar la marca. Por favor verifique los datos.',
      brand: req.body
    });
  }
};

// Formulario para editar marca
export const renderEditBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const brand = await BrandModel.findByPk(id);
    if (!brand) {
      return res.status(404).render('404', { title: 'Marca no encontrada' });
    }

    res.render('brands/edit', {
      title: 'Editar Marca',
      activeBrands: true,
      brand: brand.toJSON()
    });
  } catch (error) {
    console.error('Error al cargar la marca para editar:', error);
    res.redirect('/brands?error=' + encodeURIComponent('No fue posible cargar la marca.'));
  }
};

// Actualizar marca existente
export const updateBrand = async (req, res) => {
  const { id } = req.params;
  try {
    let { name, originCountry, status } = req.body;
    name = (name || '').trim();
    originCountry = (originCountry || '').trim();
    status = (status || '').trim();

    const brand = await BrandModel.findByPk(id);
    if (!brand) {
      return res.status(404).render('404', { title: 'Marca no encontrada' });
    }

    if (!name) {
      return res.render('brands/edit', {
        title: 'Editar Marca',
        activeBrands: true,
        error: 'El nombre de la marca es requerido.',
        brand: { id, name, originCountry, status }
      });
    }

    if (!status) {
      return res.render('brands/edit', {
        title: 'Editar Marca',
        activeBrands: true,
        error: 'El estado de la marca es requerido.',
        brand: { id, name, originCountry, status }
      });
    }

    if (status !== 'Activa' && status !== 'Inactiva') {
      return res.render('brands/edit', {
        title: 'Editar Marca',
        activeBrands: true,
        error: 'El estado seleccionado no es válido.',
        brand: { id, name, originCountry, status }
      });
    }

    // Validar duplicidad con otras marcas
    const existing = await BrandModel.findOne({
      where: {
        id: { [Op.ne]: id },
        name: { [Op.like]: name }
      }
    });

    if (existing && existing.name.toLowerCase() === name.toLowerCase()) {
      return res.render('brands/edit', {
        title: 'Editar Marca',
        activeBrands: true,
        error: 'Ya existe una marca registrada con ese nombre.',
        brand: { id, name, originCountry, status }
      });
    }

    await brand.update({
      name,
      originCountry: originCountry || null,
      status
    });

    res.redirect('/brands?success=' + encodeURIComponent('La marca fue actualizada correctamente.'));
  } catch (error) {
    console.error('Error al actualizar la marca:', error);
    res.render('brands/edit', {
      title: 'Editar Marca',
      activeBrands: true,
      error: 'Error al actualizar la marca.',
      brand: { id, ...req.body }
    });
  }
};

// Ver detalle de una marca
export const getBrandDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const brand = await BrandModel.findByPk(id, {
      include: [{ model: VehicleModel }]
    });

    if (!brand) {
      return res.status(404).render('404', { title: 'Marca no encontrada' });
    }

    const data = brand.toJSON();
    data.vehicleCount = data.Vehicles ? data.Vehicles.length : 0;

    res.render('brands/detail', {
      title: `Detalle de Marca: ${data.name}`,
      activeBrands: true,
      brand: data
    });
  } catch (error) {
    console.error('Error al obtener detalle de la marca:', error);
    res.redirect('/brands?error=' + encodeURIComponent('No fue posible cargar el detalle de la marca.'));
  }
};

// Eliminar marca
export const deleteBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const brand = await BrandModel.findByPk(id, {
      include: [{ model: VehicleModel }]
    });

    if (!brand) {
      return res.redirect('/brands?error=' + encodeURIComponent('La marca no existe.'));
    }

    // Regla: No se debe permitir eliminar una marca que tenga vehículos asociados
    if (brand.Vehicles && brand.Vehicles.length > 0) {
      return res.redirect('/brands?error=' + encodeURIComponent('No se puede eliminar porque tiene vehículos registrados.'));
    }

    await brand.destroy();
    res.redirect('/brands?success=' + encodeURIComponent('La marca fue eliminada correctamente.'));
  } catch (error) {
    console.error('Error al eliminar la marca:', error);
    res.redirect('/brands?error=' + encodeURIComponent('Error al intentar eliminar la marca.'));
  }
};
