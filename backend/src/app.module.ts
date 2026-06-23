import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AppController } from './app.controller';
import { MesService } from './mes.service';
import { DashboardService } from './services/dashboard.service';
import { NomenclatureService } from './services/nomenclature.service';
import { ProcessGraphService } from './services/process-graph.service';
import { ProductionService } from './services/production.service';
import { ReferenceService } from './services/reference.service';
import { TerminalService } from './services/terminal.service';
import { AuthService } from './auth.service';
import { RolesGuard } from './roles.guard';
import { SessionAuthGuard } from './session-auth.guard';
import { TerminalAuthGuard } from './terminal-auth.guard';

@Module({
  controllers: [AppController],
  providers: [PrismaService, MesService, AuthService, SessionAuthGuard, RolesGuard, TerminalAuthGuard, ProductionService, TerminalService, NomenclatureService, ProcessGraphService, DashboardService, ReferenceService],
})
export class AppModule {}
