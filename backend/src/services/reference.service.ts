import { Injectable } from '@nestjs/common';
import type { CalendarDayBody, CloseShiftBody, DeviationReasonBody, PersonBody, ReferenceOperationBody, ReferenceSectionBody, ShiftBody, WorkCenterBody } from '../dto/mes.dto';
import { MesService } from '../mes.service';

@Injectable()
export class ReferenceService {
  constructor(private readonly mes: MesService) {}

  sections() { return this.mes.sections(); }
  referenceData() { return this.mes.referenceData(); }
  addReferenceSection(body: ReferenceSectionBody) { return this.mes.addReferenceSection(body); }
  updateReferenceSection(id: number, body: ReferenceSectionBody) { return this.mes.updateReferenceSection(id, body); }
  addReferenceOperation(body: ReferenceOperationBody) { return this.mes.addReferenceOperation(body); }
  updateReferenceOperation(id: number, body: ReferenceOperationBody) { return this.mes.updateReferenceOperation(id, body); }
  people() { return this.mes.people(); }
  addPerson(body: PersonBody) { return this.mes.addPerson(body); }
  workCenters() { return this.mes.workCenters(); }
  upsertWorkCenter(body: WorkCenterBody) { return this.mes.upsertWorkCenter(body); }
  shifts(filter: { section?: string; date?: string; status?: string }) { return this.mes.shifts(filter); }
  createShift(body: ShiftBody) { return this.mes.createShift(body); }
  closeShift(id: number, body: CloseShiftBody) { return this.mes.closeShift(id, body); }
  calendar(filter: { from?: string; to?: string }) { return this.mes.calendar(filter); }
  upsertCalendarDay(body: CalendarDayBody) { return this.mes.upsertCalendarDay(body); }
  deviationReasons() { return this.mes.deviationReasons(); }
  upsertDeviationReason(body: DeviationReasonBody) { return this.mes.upsertDeviationReason(body); }
  sectionShiftReport(filter: { section?: string; shiftId?: string; date?: string }) { return this.mes.sectionShiftReport(filter); }
  workerReport(filter: { person?: string; from?: string; to?: string }) { return this.mes.workerReport(filter); }
}
