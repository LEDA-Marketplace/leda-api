import { Controller, Get, Query, Param } from '@nestjs/common';
import { Public } from '../../auth/decorators/public.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CollectionService } from '../services/collection.service';

@Controller('collections')
export class CollectionsController {
  constructor(private collectionService: CollectionService) {}

  @Public()
  @Get('/paginate')
  paginate(@Query() paginationDto: PaginationDto) {
    return this.collectionService.findPagination(paginationDto);
  }

  @Get('/:name')
  getByName(@Param('name') name: string) {
    return this.collectionService.findByName(name);
  }
}
