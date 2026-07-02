import { Injectable } from '@nestjs/common';
import { MesService } from '../mes.service';
import type { ImportTechProcessExcelBody, SaveNomenclatureProcessBody } from '../dto/mes.dto';

@Injectable()
export class NomenclatureService {
  constructor(private readonly mes: MesService) {}

  importOrdersExcel(file: Express.Multer.File) { return this.mes.importOrdersExcel(file); }
  previewTechProcessExcel(file: Express.Multer.File, body: ImportTechProcessExcelBody, actor?: string) { return this.mes.previewTechProcessExcel(file, body, actor); }
  importTechProcessExcel(file: Express.Multer.File, body: ImportTechProcessExcelBody, actor?: string) { return this.mes.importTechProcessExcel(file, body, actor); }
  importBatches() { return this.mes.importBatches(); }
  nomenclature(category?: string) { return this.mes.nomenclature(category); }
  nomenclatureCategories() { return this.mes.nomenclatureCategories(); }
  nomenclatureProcess(id: string) { return this.mes.nomenclatureProcess(id); }
  nomenclatureProcessVersions(id: string) { return this.mes.nomenclatureProcessVersions(id); }
  nomenclatureProcessVersion(id: string, versionId: string) { return this.mes.nomenclatureProcessVersion(id, versionId); }
  createNomenclatureProcessVersion(id: string, body: SaveNomenclatureProcessBody, actor?: string) { return this.mes.createNomenclatureProcessVersion(id, body, actor); }
  updateNomenclatureProcessVersion(id: string, versionId: string, body: SaveNomenclatureProcessBody, actor?: string) { return this.mes.updateNomenclatureProcessVersion(id, versionId, body, actor); }
  activateNomenclatureProcessVersion(id: string, versionId: string, actor?: string) { return this.mes.activateNomenclatureProcessVersion(id, versionId, actor); }
  copyNomenclatureProcessVersion(id: string, versionId: string, actor?: string) { return this.mes.copyNomenclatureProcessVersion(id, versionId, actor); }
  deleteNomenclatureProcessVersion(id: string, versionId: string) { return this.mes.deleteNomenclatureProcessVersion(id, versionId); }
  saveNomenclatureProcess(body: SaveNomenclatureProcessBody, actor?: string) { return this.mes.saveNomenclatureProcess(body, actor); }
  copyNomenclatureProcess(id: string, actor?: string) { return this.mes.copyNomenclatureProcess(id, actor); }
  deleteNomenclatureProcess(id: string) { return this.mes.deleteNomenclatureProcess(id); }
}
