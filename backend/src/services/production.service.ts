import { Injectable } from '@nestjs/common';
import { MesService } from '../mes.service';
import type { BulkProductionUnitOperationBody, CreateProductionRunBody, LaunchProductionBatchBody, LaunchProductionBody, ProductionOperationActionBody } from '../dto/mes.dto';

@Injectable()
export class ProductionService {
  constructor(private readonly mes: MesService) {}

  productionRuns() { return this.mes.productionRuns(); }
  productionPlan() { return this.mes.productionPlan(); }
  archiveProductionRuns() { return this.mes.archiveProductionRuns(); }
  launchProduction(body: LaunchProductionBody) { return this.mes.launchProduction(body); }
  launchProductionBatch(body: LaunchProductionBatchBody) { return this.mes.launchProductionBatch(body); }
  createProductionRun(body: CreateProductionRunBody) { return this.mes.createProductionRun(body); }
  productionRun(id: string) { return this.mes.productionRun(id); }
  startProductionRun(id: string) { return this.mes.startProductionRun(id); }
  deleteProductionRun(id: string) { return this.mes.deleteProductionRun(id); }
  releaseProductionUnitDispatch(id: string, unitId: string, body: ProductionOperationActionBody) { return this.mes.releaseProductionUnitDispatch(id, unitId, body); }
  productionRunOperationAction(id: string, operationId: string, action: 'start' | 'pause' | 'resume' | 'complete', body: ProductionOperationActionBody) { return this.mes.productionRunOperationAction(id, operationId, action, body); }
  productionUnitOperationAction(id: string, unitId: string, operationId: string, action: 'start' | 'pause' | 'resume' | 'complete', body: ProductionOperationActionBody) { return this.mes.productionUnitOperationAction(id, unitId, operationId, action, body); }
  productionBulkUnitOperationAction(body: BulkProductionUnitOperationBody) { return this.mes.productionBulkUnitOperationAction(body); }
}
