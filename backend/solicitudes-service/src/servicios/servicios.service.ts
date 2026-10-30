import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { CreateServicioInput } from './dto/create-servicio.input.js';
import { UpdateServicioInput } from './dto/update-servicio.input.js';
import { Servicio } from './servicio.schema.js';

const escaparRegex = (texto: string) => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

@Injectable()
export class ServiciosService {
  constructor(
    @InjectModel(Servicio.name) private readonly servicioModel: Model<Servicio>,
  ) {}

  async create(input: CreateServicioInput) {
    await this.asegurarNombreLibre(input.nombre);
    try {
      return await this.servicioModel.create(input);
    } catch (error) {
      // Por si otro pedido creó el mismo nombre entre la verificación y el alta
      if ((error as { code?: number }).code === 11000) {
        throw new ConflictException(`Ya existe un servicio llamado "${input.nombre}"`);
      }
      throw error;
    }
  }

  findAll(search?: string, activo?: boolean) {
    const filtro: Record<string, unknown> = {};
    if (search) {
      filtro.nombre = { $regex: escaparRegex(search), $options: 'i' };
    }
    if (activo !== undefined && activo !== null) {
      filtro.activo = activo;
    }
    return this.servicioModel.find(filtro).sort({ nombre: 1 }).exec();
  }

  async findOne(id: string) {
    const servicio = isValidObjectId(id)
      ? await this.servicioModel.findById(id).exec()
      : null;
    if (!servicio) {
      throw new NotFoundException(`No existe el servicio con id ${id}`);
    }
    return servicio;
  }

  async update(id: string, input: UpdateServicioInput) {
    await this.findOne(id);
    if (input.nombre) {
      await this.asegurarNombreLibre(input.nombre, id);
    }
    return this.servicioModel
      .findByIdAndUpdate(id, input, { returnDocument: 'after', runValidators: true })
      .exec();
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.servicioModel.findByIdAndDelete(id).exec();
    return true;
  }

  /** El nombre es único sin importar mayúsculas: "Curación" y "curación" son el mismo servicio. */
  private async asegurarNombreLibre(nombre: string, excluirId?: string) {
    const filtro: Record<string, unknown> = {
      nombre: { $regex: `^${escaparRegex(nombre.trim())}$`, $options: 'i' },
    };
    if (excluirId) {
      filtro._id = { $ne: excluirId };
    }
    const existente = await this.servicioModel.findOne(filtro).exec();
    if (existente) {
      throw new ConflictException(`Ya existe un servicio llamado "${nombre}"`);
    }
  }
}
