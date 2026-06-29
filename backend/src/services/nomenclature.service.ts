import { Injectable } from '@nestjs/common';
import { MesService } from '../mes.service';
import type { SaveNomenclatureProcessBody } from '../dto/mes.dto';

@Injectable()
export class NomenclatureService {
  constructor(private readonly mes: MesService) {}

  importOrdersExcel(file: Express.Multer.File) { return this.mes.importOrdersExcel(file); }
  importBatches() { return this.mes.importBatches(); }
  nomenclature(category?: string) { return this.mes.nomenclature(category); }
  nomenclatureCategories() { return this.mes.nomenclatureCategories(); }
  nomenclatureProcess(id: string) { return this.mes.nomenclatureProcess(id); }
  saveNomenclatureProcess(body: SaveNomenclatureProcessBody) { return this.mes.saveNomenclatureProcess(body); }
  copyNomenclatureProcess(id: string) { return this.mes.copyNomenclatureProcess(id); }
  deleteNomenclatureProcess(id: string) { return this.mes.deleteNomenclatureProcess(id); }
}
