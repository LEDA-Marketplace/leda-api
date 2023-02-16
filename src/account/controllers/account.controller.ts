import { Controller, Get, Param } from '@nestjs/common';
import { IsAddressValid } from '../../auth/decorators/address.decorator';
import { Collection } from '../../collections/entities/collection.entity';
import { CollectionService } from '../../collections/services/collection.service';
import { Item } from '../../items/entities/item.entity';
import { ItemService } from '../../items/services/item.service';
@Controller('accounts')
export class AccountsController {
  constructor(private itemService: ItemService, private collectionService: CollectionService) {}

  @IsAddressValid()
  @Get('/:address/items')
  findItems(@Param('address') address: string): Promise<Item[]> {
    return this.itemService.findByAddress(address);
  }

  @IsAddressValid()
  @Get('/:address/collections')
  findCollections(@Param('address') address: string): Promise<Collection[]> {
    return this.collectionService.findByOwner(address);
  }

  @IsAddressValid()
  @Get('/:address/collections-list')
  findCollectionsList(@Param('address') address: string): Promise<Collection[]> {
    return this.collectionService.findCollectionsListByOwner(address);
  }

  @IsAddressValid()
  @Get('/:address/liked-items')
  findLikedItems(@Param('address') address: string): Promise<Item[]> {
    return this.itemService.findLikedByAddress(address);
  }
}
