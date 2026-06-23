import { Injectable } from '@nestjs/common';
import { MesService } from '../mes.service';
import type { OperationActionBody } from '../dto/mes.dto';

@Injectable()
export class DashboardService {
  constructor(private readonly mes: MesService) {}

  orders() { return this.mes.orders(); }
  order(id: number) { return this.mes.order(id); }
  orderOperations(id: number) { return this.mes.orderOperations(id); }
  setOperationStatus(id: number, operationId: number, status: 'work' | 'done', body: OperationActionBody) { return this.mes.setOperationStatus(id, operationId, status, body); }
  resetOperationStatus(id: number, operationId: number) { return this.mes.resetOperationStatus(id, operationId); }
  archiveOrder(id: number) { return this.mes.archiveOrder(id); }
  archiveOrders() { return this.mes.archiveOrders(); }
  dashboardSummary() { return this.mes.dashboardSummary(); }
  sectionLoad() { return this.mes.sectionLoad(); }
  dispatchDashboard() { return this.mes.dispatchDashboard(); }
  directorDashboard() { return this.mes.directorDashboard(); }
  qualitySummary() { return this.mes.qualitySummary(); }
  events() { return this.mes.events(); }
}
