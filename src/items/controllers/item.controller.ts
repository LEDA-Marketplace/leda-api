import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { IsAddressValid } from '../../auth/decorators/address.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { BuyRequestDto } from '../dto/buy-request.dto';
import { DelistItemRequestDto } from '../dto/delist-item-request.dto';
import { ItemRequestDto } from '../dto/item-request.dto';
import { ItemPaginationDto } from '../dto/pagination-request.dto';
import { ListItemRequestDto } from '../dto/list-item-request.dto';
import { History } from '../entities/history.entity';
import { Item } from '../entities/item.entity';
import { HistoryService } from '../services/history.service';
import { ItemService } from '../services/item.service';
import { PriceRangeDto } from '../dto/price-range.dto';
import { DraftItemRequestDto } from '../dto/draft-item-request.dto';
import { NewestItemsRequestDto } from '../dto/newest-items-request.dto';
import { Voucher } from '../entities/voucher.entity';
import { TransferDto } from '../dto/transfer-request.dto';
import { LazyItemRequestDto } from '../dto/lazy-item-request.dto';

@Controller('items')
export class ItemsController {
  constructor(private itemService: ItemService, private historyService: HistoryService) {}

  @Public()
  @Get()
  findAll(): Promise<Item[]> {
    return this.itemService.findAll();
  }

  @Public()
  @Get('/paginate')
  paginate(@Query() paginationDto: ItemPaginationDto) {
    return this.itemService.findPagination(paginationDto);
  }

  @Public()
  @Get('/newest')
  getNewest(@Query() NewestQuery: NewestItemsRequestDto): Promise<Item[]> {
    return this.itemService.getNewest(NewestQuery.qty);
  }

  @Public()
  @Get('/history')
  findAllHistory(): Promise<History[]> {
    return this.historyService.findAll();
  }

  @Public()
  @Get('/price-range')
  findPriceRange(): Promise<PriceRangeDto> {
    return this.itemService.findPriceRange();
  }

  @Public()
  @Get(':itemId/history')
  findAllByItemId(@Param('itemId') itemId: string): Promise<History[]> {
    return this.historyService.findAllByItemId(itemId);
  }

  @Public()
  @Get('/:itemId')
  findById(@Param('itemId') itemId: string): Promise<Item> {
    return this.itemService.findById(itemId);
  }

  @Get('/:itemId/voucher')
  getVoucher(@Param('itemId') itemId: string): Promise<Voucher> {
    return this.itemService.findVoucherByItemId(itemId);
  }

  @IsAddressValid()
  @Patch(':itemId/like')
  like(@Param('itemId') itemId: string, @Body('address') address: string): Promise<Item> {
    return this.itemService.like(itemId, address);
  }

  @IsAddressValid()
  @Post()
  create(@Body() itemRequestDto: DraftItemRequestDto) {
    return this.itemService.create(itemRequestDto);
  }

  @IsAddressValid()
  @Post('/:itemId/buy')
  buyItem(@Param('itemId') itemId: string, @Body() buyRequestDto: BuyRequestDto): Promise<Item> {
    buyRequestDto.itemId = itemId;
    return this.itemService.buyItem(buyRequestDto);
  }

  @IsAddressValid()
  @Post('/:itemId/list')
  listAnItem(
    @Param('itemId') itemId: string,
    @Body() listItemRequestDto: ListItemRequestDto
  ): Promise<Item> {
    listItemRequestDto.itemId = itemId;
    return this.itemService.listAnItem(listItemRequestDto);
  }

  @IsAddressValid()
  @Patch('/:itemId/delist')
  delistAnItem(
    @Param('itemId') itemId: string,
    @Body() delistItemRequestDto: DelistItemRequestDto
  ): Promise<Item> {
    delistItemRequestDto.itemId = itemId;
    return this.itemService.delistAnItem(delistItemRequestDto);
  }

  @IsAddressValid()
  @Patch('/:itemId/activate')
  activate(@Param('itemId') itemId: string, @Body() itemRequest: ItemRequestDto): Promise<Item> {
    return this.itemService.activate(itemId, itemRequest);
  }

  @IsAddressValid()
  @Patch('/:itemId/process-lazy-item')
  processLazyItem(
    @Param('itemId') itemId: string,
    @Body() lazyItemRequest: LazyItemRequestDto
  ): Promise<Item> {
    return this.itemService.processLazyItem(itemId, lazyItemRequest);
  }

  @IsAddressValid()
  @Patch('/:itemId/transfer')
  transfer(@Param('itemId') itemId: string, @Body() transferDto: TransferDto): Promise<void> {
    return this.itemService.transfer(itemId, transferDto);
  }

  @Patch('/:itemId/hide-unhide')
  hideAndUnhide(@Param('itemId') itemId: string): Promise<Item> {
    return this.itemService.hideAndUnhide(itemId);
  }
}
