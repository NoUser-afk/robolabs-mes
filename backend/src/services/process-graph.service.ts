import { Injectable } from '@nestjs/common';
import { MesService } from '../mes.service';

@Injectable()
export class ProcessGraphService {
  constructor(private readonly mes: MesService) {}

  productionProcessGraph(runId?: string, unitId?: string) { return this.mes.productionProcessGraph(runId, unitId); }
  productionUnitGraph(id: string, unitId: string) { return this.mes.productionUnitGraph(id, unitId); }
}
