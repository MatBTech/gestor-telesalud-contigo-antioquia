import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Atencion, Kit, Municipio } from '../entidades';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [TypeOrmModule.forFeature([Atencion, Kit, Municipio])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
