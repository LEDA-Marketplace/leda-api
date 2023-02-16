import { Controller, Get, Query, Param } from '@nestjs/common';
import { NewestItemsRequestDto } from 'src/items/dto/newest-items-request.dto';
import { ItemPaginationDto } from 'src/items/dto/pagination-request.dto';
import { PriceRangeDto } from 'src/items/dto/price-range.dto';
import { Public } from '../../auth/decorators/public.decorator';
import { CollectionPaginationDto } from '../dto/collection-pagination-request.dto';
import { CollectionService } from '../services/collection.service';

@Controller('collections')
export class CollectionsController {
  constructor(private collectionService: CollectionService) {}

  @Public()
  @Get('/paginate')
  paginate(@Query() paginationDto: CollectionPaginationDto) {
    return this.collectionService.findPaginationCollection(paginationDto);
  }

  @Public()
  @Get('/newest')
  getNewest(@Query() NewestQuery: NewestItemsRequestDto) {
    return this.collectionService.getNewest(NewestQuery.qty);
  }

  @Public()
  @Get('/:id')
  getByName(@Param('id') id: string) {
    return this.collectionService.findById(id);
  }

  @Public()
  @Get('/:collectionId/paginate')
  paginateNfts(
    @Param('collectionId') collectionId: string,
    @Query() paginationDto: ItemPaginationDto
  ) {
    return this.collectionService.findNftsOnCollection(collectionId, paginationDto);
  }

  @Public()
  @Get('/:collectionId/price-range')
  findPriceRange(@Param('collectionId') collectionId: string): Promise<PriceRangeDto> {
    return this.collectionService.findPriceRange(collectionId);
  }
}
