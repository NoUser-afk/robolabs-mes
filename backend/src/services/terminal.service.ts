import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../auth.types';
import type { BulkProductionUnitOperationBody, OperationActionBody, ProductionOperationActionBody, ProductionOperationSelectionBody, QualityBody } from '../dto/mes.dto';
import { MesService } from '../mes.service';

@Injectable()
export class TerminalService {
  constructor(private readonly mes: MesService) {}

  workCenterTerminalForUser(user: AuthUser) { return this.mes.workCenterTerminalForUser(user); }
  workCenterTerminal(section: string) { return this.mes.workCenterTerminal(section); }
  terminalOrderOperationAction(user: AuthUser, id: number, action: 'start' | 'pause' | 'resume' | 'complete', body: OperationActionBody) { return this.mes.terminalOrderOperationAction(user, id, action, body); }
  selectProductionUnitOperation(user: AuthUser, operationPk: string, body: ProductionOperationSelectionBody) { return this.mes.selectProductionUnitOperation(user, operationPk, body); }
  heartbeatProductionUnitOperation(user: AuthUser, operationPk: string, body: ProductionOperationSelectionBody) { return this.mes.heartbeatProductionUnitOperation(user, operationPk, body); }
  releaseProductionUnitOperationSelection(user: AuthUser, operationPk: string, body: ProductionOperationSelectionBody) { return this.mes.releaseProductionUnitOperationSelection(user, operationPk, body); }
  terminalProductionUnitOperationAction(user: AuthUser, id: string, unitId: string, operationId: string, action: 'start' | 'pause' | 'resume' | 'complete', body: ProductionOperationActionBody) { return this.mes.terminalProductionUnitOperationAction(user, id, unitId, operationId, action, body); }
  productionBulkUnitOperationAction(body: BulkProductionUnitOperationBody, user?: AuthUser) { return this.mes.productionBulkUnitOperationAction(body, user); }
  setOperationStatusById(id: number, status: 'work' | 'done', body: OperationActionBody) { return this.mes.setOperationStatusById(id, status, body); }
  pauseOperationById(id: number, body: OperationActionBody) { return this.mes.pauseOperationById(id, body); }
  resumeOperationById(id: number, body: OperationActionBody) { return this.mes.resumeOperationById(id, body); }
  addOperationQuality(id: number, body: QualityBody) { return this.mes.addOperationQuality(id, body); }
}
