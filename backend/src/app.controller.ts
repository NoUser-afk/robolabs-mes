import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { Public, Roles } from './auth.decorators';
import { AuthService } from './auth.service';
import { AuthRequest } from './auth.types';
import type {
  BulkProductionUnitOperationBody,
  CalendarDayBody,
  CloseShiftBody,
  CustomerOrderStatusBody,
  CreateProductionRunBody,
  DeviationReasonBody,
  LaunchProductionBatchBody,
  LaunchProductionBody,
  ImportTechProcessExcelBody,
  OperationActionBody,
  PersonBody,
  ProductionOperationActionBody,
  ProductionOperationSelectionBody,
  QualityBody,
  ReferenceOperationBody,
  ReferenceSectionBody,
  SaveNomenclatureProcessBody,
  ShiftBody,
  WorkCenterBody,
} from './dto/mes.dto';
import { RolesGuard } from './roles.guard';
import { SessionAuthGuard } from './session-auth.guard';
import { DashboardService } from './services/dashboard.service';
import { NomenclatureService } from './services/nomenclature.service';
import { ProcessGraphService } from './services/process-graph.service';
import { ProductionService } from './services/production.service';
import { ReferenceService } from './services/reference.service';
import { TerminalService } from './services/terminal.service';
import { TerminalAuthGuard } from './terminal-auth.guard';

@UseGuards(SessionAuthGuard, RolesGuard)
@Roles('admin', 'dispatcher', 'technologist', 'director', 'operator')
@Controller()
export class AppController {
  constructor(
    private readonly production: ProductionService,
    private readonly terminal: TerminalService,
    private readonly nomenclatureService: NomenclatureService,
    private readonly processGraph: ProcessGraphService,
    private readonly dashboard: DashboardService,
    private readonly reference: ReferenceService,
    private readonly auth: AuthService,
  ) {}

  @Public()
  @Get('health')
  health() {
    return { ok: true, service: 'RoboPulse' };
  }

  @Public()
  @Post('auth/login')
  async login(@Body() body: { login?: string; password?: string }, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.login(body);
    res.setHeader('Set-Cookie', this.auth.sessionCookie(result.token));
    return { user: result.user };
  }

  @Public()
  @Get('auth/terminals')
  terminals() {
    return this.auth.terminalProfiles();
  }

  @Public()
  @Post('auth/terminal-login')
  async terminalLogin(@Body() body: { login?: string; password?: string }, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.terminalLogin(body);
    res.setHeader('Set-Cookie', this.auth.sessionCookie(result.token));
    return { user: result.user };
  }

  @Public()
  @Post('auth/terminal-qr-login')
  async terminalQrLogin(@Body() body: { qr?: string; token?: string }, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.terminalQrLogin(body);
    res.setHeader('Set-Cookie', this.auth.sessionCookie(result.token));
    return { user: result.user };
  }

  @Public()
  @Get('auth/debug-profiles')
  debugProfiles() {
    return this.auth.debugProfiles();
  }

  @Public()
  @Post('auth/debug-login')
  async debugLogin(@Body() body: { login?: string }, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.debugLogin(body);
    res.setHeader('Set-Cookie', this.auth.sessionCookie(result.token));
    return { user: result.user };
  }

  @Public()
  @Post('auth/logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.setHeader('Set-Cookie', this.auth.signOutCookie());
    return { ok: true };
  }

  @Roles('terminal', 'operator', 'dispatcher', 'technologist', 'director', 'admin')
  @Get('auth/me')
  async me(@Req() req: AuthRequest) {
    const token = this.auth.extractTokenFromCookieHeader(req.headers?.cookie);
    return { user: await this.auth.authenticate(token) };
  }

  @Roles('terminal')
  @UseGuards(TerminalAuthGuard)
  @Get('me/terminal')
  myTerminal(@Req() req: AuthRequest) {
    return this.terminal.workCenterTerminalForUser(req.user!);
  }

  @Roles('terminal')
  @UseGuards(TerminalAuthGuard)
  @Post('me/terminal/operations/:id/start')
  terminalStartOperationById(@Req() req: AuthRequest, @Param('id', ParseIntPipe) id: number, @Body() body: OperationActionBody) {
    return this.terminal.terminalOrderOperationAction(req.user!, id, 'start', body);
  }

  @Roles('terminal')
  @UseGuards(TerminalAuthGuard)
  @Post('me/terminal/operations/:id/pause')
  terminalPauseOperationById(@Req() req: AuthRequest, @Param('id', ParseIntPipe) id: number, @Body() body: OperationActionBody) {
    return this.terminal.terminalOrderOperationAction(req.user!, id, 'pause', body);
  }

  @Roles('terminal')
  @UseGuards(TerminalAuthGuard)
  @Post('me/terminal/operations/:id/resume')
  terminalResumeOperationById(@Req() req: AuthRequest, @Param('id', ParseIntPipe) id: number, @Body() body: OperationActionBody) {
    return this.terminal.terminalOrderOperationAction(req.user!, id, 'resume', body);
  }

  @Roles('terminal')
  @UseGuards(TerminalAuthGuard)
  @Post('me/terminal/operations/:id/complete')
  terminalCompleteOperationById(@Req() req: AuthRequest, @Param('id', ParseIntPipe) id: number, @Body() body: OperationActionBody) {
    return this.terminal.terminalOrderOperationAction(req.user!, id, 'complete', body);
  }

  @Roles('terminal')
  @UseGuards(TerminalAuthGuard)
  @Post('me/terminal/production/unit-operations/:operationPk/select')
  terminalSelectProductionUnitOperation(@Req() req: AuthRequest, @Param('operationPk') operationPk: string, @Body() body: ProductionOperationSelectionBody) {
    return this.terminal.selectProductionUnitOperation(req.user!, operationPk, body);
  }

  @Roles('terminal')
  @UseGuards(TerminalAuthGuard)
  @Post('me/terminal/production/unit-operations/:operationPk/heartbeat')
  terminalHeartbeatProductionUnitOperation(@Req() req: AuthRequest, @Param('operationPk') operationPk: string, @Body() body: ProductionOperationSelectionBody) {
    return this.terminal.heartbeatProductionUnitOperation(req.user!, operationPk, body);
  }

  @Roles('terminal')
  @UseGuards(TerminalAuthGuard)
  @Post('me/terminal/production/unit-operations/:operationPk/release-selection')
  terminalReleaseProductionUnitOperationSelection(@Req() req: AuthRequest, @Param('operationPk') operationPk: string, @Body() body: ProductionOperationSelectionBody) {
    return this.terminal.releaseProductionUnitOperationSelection(req.user!, operationPk, body);
  }

  @Roles('terminal')
  @UseGuards(TerminalAuthGuard)
  @Post('me/terminal/production/runs/:id/units/:unitId/operations/:operationId/start')
  terminalStartProductionUnitOperation(@Req() req: AuthRequest, @Param('id') id: string, @Param('unitId') unitId: string, @Param('operationId') operationId: string, @Body() body: ProductionOperationActionBody) {
    return this.terminal.terminalProductionUnitOperationAction(req.user!, id, unitId, operationId, 'start', body);
  }

  @Roles('terminal')
  @UseGuards(TerminalAuthGuard)
  @Post('me/terminal/production/runs/:id/units/:unitId/operations/:operationId/pause')
  terminalPauseProductionUnitOperation(@Req() req: AuthRequest, @Param('id') id: string, @Param('unitId') unitId: string, @Param('operationId') operationId: string, @Body() body: ProductionOperationActionBody) {
    return this.terminal.terminalProductionUnitOperationAction(req.user!, id, unitId, operationId, 'pause', body);
  }

  @Roles('terminal')
  @UseGuards(TerminalAuthGuard)
  @Post('me/terminal/production/runs/:id/units/:unitId/operations/:operationId/resume')
  terminalResumeProductionUnitOperation(@Req() req: AuthRequest, @Param('id') id: string, @Param('unitId') unitId: string, @Param('operationId') operationId: string, @Body() body: ProductionOperationActionBody) {
    return this.terminal.terminalProductionUnitOperationAction(req.user!, id, unitId, operationId, 'resume', body);
  }

  @Roles('terminal')
  @UseGuards(TerminalAuthGuard)
  @Post('me/terminal/production/runs/:id/units/:unitId/operations/:operationId/complete')
  terminalCompleteProductionUnitOperation(@Req() req: AuthRequest, @Param('id') id: string, @Param('unitId') unitId: string, @Param('operationId') operationId: string, @Body() body: ProductionOperationActionBody) {
    return this.terminal.terminalProductionUnitOperationAction(req.user!, id, unitId, operationId, 'complete', body);
  }

  @Roles('terminal')
  @UseGuards(TerminalAuthGuard)
  @Post('me/terminal/production/unit-operations/bulk-action')
  terminalBulkProductionUnitOperation(@Req() req: AuthRequest, @Body() body: BulkProductionUnitOperationBody) {
    return this.terminal.productionBulkUnitOperationAction(body, req.user!);
  }

  @Roles('dispatcher', 'admin')
  @Post('import/orders-excel')
  @UseInterceptors(FileInterceptor('file'))
  importOrders(@UploadedFile() file: Express.Multer.File) {
    return this.nomenclatureService.importOrdersExcel(file);
  }

  @Roles('dispatcher', 'admin')
  @Get('import/batches')
  importBatches() {
    return this.nomenclatureService.importBatches();
  }

  @Roles('technologist', 'admin')
  @Post('import/techprocess-excel/preview')
  @UseInterceptors(FileInterceptor('file'))
  previewTechProcessExcel(@Req() req: AuthRequest, @UploadedFile() file: Express.Multer.File, @Body() body: ImportTechProcessExcelBody) {
    return this.nomenclatureService.previewTechProcessExcel(file, body, req.user?.displayName || req.user?.login);
  }

  @Roles('technologist', 'admin')
  @Post('import/techprocess-excel')
  @UseInterceptors(FileInterceptor('file'))
  importTechProcessExcel(@Req() req: AuthRequest, @UploadedFile() file: Express.Multer.File, @Body() body: ImportTechProcessExcelBody) {
    return this.nomenclatureService.importTechProcessExcel(file, body, req.user?.displayName || req.user?.login);
  }

  @Get('orders')
  orders() {
    return this.dashboard.orders();
  }

  @Get('orders/:id')
  order(@Param('id', ParseIntPipe) id: number) {
    return this.dashboard.order(id);
  }

  @Get('orders/:id/operations')
  orderOperations(@Param('id', ParseIntPipe) id: number) {
    return this.dashboard.orderOperations(id);
  }

  @Roles('dispatcher', 'admin')
  @Post('orders/:id/operations/:operationId/start')
  startOperation(
    @Param('id', ParseIntPipe) id: number,
    @Param('operationId', ParseIntPipe) operationId: number,
    @Body() body: OperationActionBody,
  ) {
    return this.dashboard.setOperationStatus(id, operationId, 'work', body);
  }

  @Roles('dispatcher', 'admin')
  @Post('orders/:id/operations/:operationId/finish')
  finishOperation(
    @Param('id', ParseIntPipe) id: number,
    @Param('operationId', ParseIntPipe) operationId: number,
    @Body() body: OperationActionBody,
  ) {
    return this.dashboard.setOperationStatus(id, operationId, 'done', body);
  }

  @Roles('dispatcher', 'admin')
  @Post('orders/:id/operations/:operationId/reset')
  resetOperation(
    @Param('id', ParseIntPipe) id: number,
    @Param('operationId', ParseIntPipe) operationId: number,
  ) {
    return this.dashboard.resetOperationStatus(id, operationId);
  }

  @Roles('dispatcher', 'admin')
  @Post('orders/:id/archive')
  archiveOrder(@Param('id', ParseIntPipe) id: number) {
    return this.dashboard.archiveOrder(id);
  }

  @Roles('dispatcher', 'admin')
  @Post('orders/:id/customer-access')
  generateCustomerOrderAccess(@Req() req: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    return this.dashboard.generateCustomerOrderAccess(id, req.user?.displayName || req.user?.login);
  }

  @Public()
  @Post('customer/order-status')
  customerOrderStatus(@Body() body: CustomerOrderStatusBody) {
    return this.dashboard.customerOrderStatus(body);
  }

  @Get('archive/orders')
  archiveOrders() {
    return this.dashboard.archiveOrders();
  }

  @Get('archive/production-runs')
  archiveProductionRuns() {
    return this.production.archiveProductionRuns();
  }

  @Get('sections')
  sections() {
    return this.reference.sections();
  }

  @Get('reference-data')
  referenceData() {
    return this.reference.referenceData();
  }

  @Roles('technologist', 'dispatcher', 'admin')
  @Post('reference-sections')
  addReferenceSection(@Body() body: ReferenceSectionBody) {
    return this.reference.addReferenceSection(body);
  }

  @Roles('technologist', 'dispatcher', 'admin')
  @Post('reference-sections/:id')
  updateReferenceSection(@Param('id', ParseIntPipe) id: number, @Body() body: ReferenceSectionBody) {
    return this.reference.updateReferenceSection(id, body);
  }

  @Roles('technologist', 'dispatcher', 'admin')
  @Post('reference-operations')
  addReferenceOperation(@Body() body: ReferenceOperationBody) {
    return this.reference.addReferenceOperation(body);
  }

  @Roles('technologist', 'dispatcher', 'admin')
  @Post('reference-operations/:id')
  updateReferenceOperation(@Param('id', ParseIntPipe) id: number, @Body() body: ReferenceOperationBody) {
    return this.reference.updateReferenceOperation(id, body);
  }

  @Get('people')
  people() {
    return this.reference.people();
  }

  @Roles('admin')
  @Post('people')
  addPerson(@Body() body: PersonBody) {
    return this.reference.addPerson(body);
  }

  @Get('work-centers')
  workCenters() {
    return this.reference.workCenters();
  }

  @Roles('dispatcher', 'admin')
  @Post('work-centers')
  upsertWorkCenter(@Body() body: WorkCenterBody) {
    return this.reference.upsertWorkCenter(body);
  }

  @Get('shifts')
  shifts(@Query('section') section?: string, @Query('date') date?: string, @Query('status') status?: string) {
    return this.reference.shifts({ section, date, status });
  }

  @Roles('dispatcher', 'admin')
  @Post('shifts')
  createShift(@Body() body: ShiftBody) {
    return this.reference.createShift(body);
  }

  @Roles('dispatcher', 'admin')
  @Post('shifts/:id/close')
  closeShift(@Param('id', ParseIntPipe) id: number, @Body() body: CloseShiftBody) {
    return this.reference.closeShift(id, body);
  }

  @Get('calendar')
  calendar(@Query('from') from?: string, @Query('to') to?: string) {
    return this.reference.calendar({ from, to });
  }

  @Roles('dispatcher', 'admin')
  @Post('calendar-days')
  upsertCalendarDay(@Body() body: CalendarDayBody) {
    return this.reference.upsertCalendarDay(body);
  }

  @Get('deviation-reasons')
  deviationReasons() {
    return this.reference.deviationReasons();
  }

  @Roles('dispatcher', 'admin')
  @Post('deviation-reasons')
  upsertDeviationReason(@Body() body: DeviationReasonBody) {
    return this.reference.upsertDeviationReason(body);
  }

  @Get('reports/section-shift')
  sectionShiftReport(@Query('section') section?: string, @Query('shiftId') shiftId?: string, @Query('date') date?: string) {
    return this.reference.sectionShiftReport({ section, shiftId, date });
  }

  @Get('reports/worker')
  workerReport(@Query('person') person?: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.reference.workerReport({ person, from, to });
  }

  @Get('nomenclature')
  nomenclature(@Query('category') category?: string) {
    return this.nomenclatureService.nomenclature(category);
  }

  @Get('nomenclature/categories')
  nomenclatureCategories() {
    return this.nomenclatureService.nomenclatureCategories();
  }

  @Get('nomenclature/:id/versions')
  nomenclatureProcessVersions(@Param('id') id: string) {
    return this.nomenclatureService.nomenclatureProcessVersions(id);
  }

  @Get('nomenclature/:id/versions/:versionId')
  nomenclatureProcessVersion(@Param('id') id: string, @Param('versionId') versionId: string) {
    return this.nomenclatureService.nomenclatureProcessVersion(id, versionId);
  }

  @Roles('technologist', 'dispatcher', 'admin')
  @Post('nomenclature/:id/versions')
  createNomenclatureProcessVersion(@Req() req: AuthRequest, @Param('id') id: string, @Body() body: SaveNomenclatureProcessBody) {
    return this.nomenclatureService.createNomenclatureProcessVersion(id, body, req.user?.displayName || req.user?.login);
  }

  @Roles('technologist', 'dispatcher', 'admin')
  @Patch('nomenclature/:id/versions/:versionId')
  updateNomenclatureProcessVersion(@Req() req: AuthRequest, @Param('id') id: string, @Param('versionId') versionId: string, @Body() body: SaveNomenclatureProcessBody) {
    return this.nomenclatureService.updateNomenclatureProcessVersion(id, versionId, body, req.user?.displayName || req.user?.login);
  }

  @Roles('technologist', 'dispatcher', 'admin')
  @Post('nomenclature/:id/versions/:versionId/activate')
  activateNomenclatureProcessVersion(@Req() req: AuthRequest, @Param('id') id: string, @Param('versionId') versionId: string) {
    return this.nomenclatureService.activateNomenclatureProcessVersion(id, versionId, req.user?.displayName || req.user?.login);
  }

  @Roles('technologist', 'dispatcher', 'admin')
  @Post('nomenclature/:id/versions/:versionId/copy')
  copyNomenclatureProcessVersion(@Req() req: AuthRequest, @Param('id') id: string, @Param('versionId') versionId: string) {
    return this.nomenclatureService.copyNomenclatureProcessVersion(id, versionId, req.user?.displayName || req.user?.login);
  }

  @Roles('technologist', 'dispatcher', 'admin')
  @Delete('nomenclature/:id/versions/:versionId')
  deleteNomenclatureProcessVersion(@Param('id') id: string, @Param('versionId') versionId: string) {
    return this.nomenclatureService.deleteNomenclatureProcessVersion(id, versionId);
  }

  @Get('nomenclature/:id/process')
  nomenclatureProcess(@Param('id') id: string) {
    return this.nomenclatureService.nomenclatureProcess(id);
  }

  @Roles('technologist', 'dispatcher', 'admin')
  @Post('nomenclature/processes')
  saveNomenclatureProcess(@Req() req: AuthRequest, @Body() body: SaveNomenclatureProcessBody) {
    return this.nomenclatureService.saveNomenclatureProcess(body, req.user?.displayName || req.user?.login);
  }

  @Roles('technologist', 'dispatcher', 'admin')
  @Post('nomenclature/:id/process/copy')
  copyNomenclatureProcess(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.nomenclatureService.copyNomenclatureProcess(id, req.user?.displayName || req.user?.login);
  }

  @Roles('technologist', 'dispatcher', 'admin')
  @Delete('nomenclature/:id/process')
  deleteNomenclatureProcess(@Param('id') id: string) {
    return this.nomenclatureService.deleteNomenclatureProcess(id);
  }

  @Get('production/runs')
  productionRuns() {
    return this.production.productionRuns();
  }

  @Get('production/plan')
  productionPlan() {
    return this.production.productionPlan();
  }

  @Get('production/process-graph')
  productionProcessGraph(@Query('runId') runId?: string, @Query('unitId') unitId?: string) {
    return this.processGraph.productionProcessGraph(runId, unitId);
  }

  @Roles('dispatcher', 'admin')
  @Post('production/launch')
  launchProduction(@Body() body: LaunchProductionBody) {
    return this.production.launchProduction(body);
  }

  @Roles('dispatcher', 'admin')
  @Post('production/batches')
  launchProductionBatch(@Body() body: LaunchProductionBatchBody) {
    return this.production.launchProductionBatch(body);
  }

  @Roles('dispatcher', 'admin')
  @Post('production/runs')
  createProductionRun(@Body() body: CreateProductionRunBody) {
    return this.production.createProductionRun(body);
  }

  @Get('production/runs/:id')
  productionRun(@Param('id') id: string) {
    return this.production.productionRun(id);
  }

  @Roles('dispatcher', 'admin')
  @Post('production/runs/:id/customer-access')
  generateCustomerProductionRunAccess(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.production.generateCustomerProductionRunAccess(id, req.user?.displayName || req.user?.login);
  }

  @Get('production/runs/:id/units/:unitId/graph')
  productionUnitGraph(@Param('id') id: string, @Param('unitId') unitId: string) {
    return this.processGraph.productionUnitGraph(id, unitId);
  }

  @Roles('dispatcher', 'admin')
  @Post('production/runs/:id/start')
  startProductionRun(@Param('id') id: string) {
    return this.production.startProductionRun(id);
  }

  @Roles('dispatcher', 'admin')
  @Delete('production/runs/:id')
  deleteProductionRun(@Param('id') id: string) {
    return this.production.deleteProductionRun(id);
  }

  @Roles('dispatcher', 'admin')
  @Post('production/runs/:id/operations/:operationId/start')
  startProductionRunOperation(@Param('id') id: string, @Param('operationId') operationId: string, @Body() body: ProductionOperationActionBody) {
    return this.production.productionRunOperationAction(id, operationId, 'start', body);
  }

  @Roles('dispatcher', 'admin')
  @Post('production/runs/:id/units/:unitId/operations/:operationId/start')
  startProductionUnitOperation(@Param('id') id: string, @Param('unitId') unitId: string, @Param('operationId') operationId: string, @Body() body: ProductionOperationActionBody) {
    return this.production.productionUnitOperationAction(id, unitId, operationId, 'start', body);
  }

  @Roles('dispatcher', 'admin')
  @Post('production/runs/:id/units/:unitId/dispatch/release')
  releaseProductionUnitDispatch(@Param('id') id: string, @Param('unitId') unitId: string, @Body() body: ProductionOperationActionBody) {
    return this.production.releaseProductionUnitDispatch(id, unitId, body);
  }

  @Roles('dispatcher', 'admin')
  @Post('production/runs/:id/units/:unitId/dispatch/complete')
  completeProductionUnitDispatch(@Param('id') id: string, @Param('unitId') unitId: string, @Body() body: ProductionOperationActionBody) {
    return this.production.releaseProductionUnitDispatch(id, unitId, body);
  }

  @Roles('dispatcher', 'admin')
  @Post('production/runs/:id/units/:unitId/operations/:operationId/pause')
  pauseProductionUnitOperation(@Param('id') id: string, @Param('unitId') unitId: string, @Param('operationId') operationId: string, @Body() body: ProductionOperationActionBody) {
    return this.production.productionUnitOperationAction(id, unitId, operationId, 'pause', body);
  }

  @Roles('dispatcher', 'admin')
  @Post('production/runs/:id/units/:unitId/operations/:operationId/resume')
  resumeProductionUnitOperation(@Param('id') id: string, @Param('unitId') unitId: string, @Param('operationId') operationId: string, @Body() body: ProductionOperationActionBody) {
    return this.production.productionUnitOperationAction(id, unitId, operationId, 'resume', body);
  }

  @Roles('dispatcher', 'admin')
  @Post('production/runs/:id/units/:unitId/operations/:operationId/complete')
  completeProductionUnitOperation(@Param('id') id: string, @Param('unitId') unitId: string, @Param('operationId') operationId: string, @Body() body: ProductionOperationActionBody) {
    return this.production.productionUnitOperationAction(id, unitId, operationId, 'complete', body);
  }

  @Roles('dispatcher', 'admin')
  @Post('production/unit-operations/bulk-action')
  bulkProductionUnitOperation(@Body() body: BulkProductionUnitOperationBody) {
    return this.production.productionBulkUnitOperationAction(body);
  }

  @Roles('dispatcher', 'admin')
  @Post('production/runs/:id/operations/:operationId/pause')
  pauseProductionRunOperation(@Param('id') id: string, @Param('operationId') operationId: string, @Body() body: ProductionOperationActionBody) {
    return this.production.productionRunOperationAction(id, operationId, 'pause', body);
  }

  @Roles('dispatcher', 'admin')
  @Post('production/runs/:id/operations/:operationId/resume')
  resumeProductionRunOperation(@Param('id') id: string, @Param('operationId') operationId: string, @Body() body: ProductionOperationActionBody) {
    return this.production.productionRunOperationAction(id, operationId, 'resume', body);
  }

  @Roles('dispatcher', 'admin')
  @Post('production/runs/:id/operations/:operationId/complete')
  completeProductionRunOperation(@Param('id') id: string, @Param('operationId') operationId: string, @Body() body: ProductionOperationActionBody) {
    return this.production.productionRunOperationAction(id, operationId, 'complete', body);
  }

  @Get('dashboard/summary')
  dashboardSummary() {
    return this.dashboard.dashboardSummary();
  }

  @Get('dashboard/section-load')
  sectionLoad() {
    return this.dashboard.sectionLoad();
  }

  @Get('dispatch/dashboard')
  dispatchDashboard() {
    return this.dashboard.dispatchDashboard();
  }

  @Roles('dispatcher', 'operator', 'admin')
  @Get('work-centers/:section/terminal')
  workCenterTerminal(@Param('section') section: string) {
    return this.terminal.workCenterTerminal(section);
  }

  @Roles('dispatcher', 'operator', 'admin')
  @Post('operations/:id/start')
  startOperationById(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: OperationActionBody,
  ) {
    return this.terminal.setOperationStatusById(id, 'work', body);
  }

  @Roles('dispatcher', 'operator', 'admin')
  @Post('operations/:id/pause')
  pauseOperationById(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: OperationActionBody,
  ) {
    return this.terminal.pauseOperationById(id, body);
  }

  @Roles('dispatcher', 'operator', 'admin')
  @Post('operations/:id/resume')
  resumeOperationById(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: OperationActionBody,
  ) {
    return this.terminal.resumeOperationById(id, body);
  }

  @Roles('dispatcher', 'operator', 'admin')
  @Post('operations/:id/complete')
  completeOperationById(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: OperationActionBody,
  ) {
    return this.terminal.setOperationStatusById(id, 'done', body);
  }

  @Roles('dispatcher', 'operator', 'admin')
  @Post('operations/:id/quality')
  addOperationQuality(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: QualityBody,
  ) {
    return this.terminal.addOperationQuality(id, body);
  }

  @Get('quality/summary')
  qualitySummary() {
    return this.dashboard.qualitySummary();
  }

  @Roles('director', 'admin')
  @Get('director/dashboard')
  directorDashboard() {
    return this.dashboard.directorDashboard();
  }

  @Get('events')
  events() {
    return this.dashboard.events();
  }
}
