import { Controller, Get, Post, Query } from '@nestjs/common';
import { Public } from '../../auth/decorators/public.decorator';
import { ItemPropertyDto } from '../dto/item-property.dto';
import { MigrationRequestDto } from '../dto/migration-request.dto';
import { Item } from '../entities/item.entity';
import { HistoryService } from '../services/history.service';
import { ItemService } from '../services/item.service';
import { MigrationService } from '../services/migration.service';

type JupApeType = {
  name: string;
  description: string;
  itemProperties: JupApeProps[];
  price: string;
  royalty: number;
};

type JupApeProps = {
  key: string;
  value: string;
};

type MigrationRequest = {
  apes: JupApeType[];
};

@Controller('migration')
export class MigrationController {
  constructor(private migrationService: MigrationService) {}

  @Public()
  @Post()
  start(@Query() migrationQuery: MigrationRequestDto) {
    console.log('Executing controller: v4');
    return this.migrationService.init({
      from: Number(migrationQuery.from),
      to: Number(migrationQuery.to),
    });
  }
}
