import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Kit, Municipio } from '../entidades';
import { KitsController } from './kits.controller';
import { KitsService } from './kits.service';

@Module({
  imports: [TypeOrmModule.forFeature([Kit, Municipio])],
  controllers: [KitsController],
  providers: [KitsService],
})
export class KitsModule {}
