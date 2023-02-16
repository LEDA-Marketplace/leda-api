import { ItemRepository } from './../../items/repositories/item.repository';
import { Injectable } from '@nestjs/common';
import { AccountRepository } from '../../account/repositories/account.repository';
import { BusinessErrors } from '../../common/constants';
import { BusinessException } from '../../common/exceptions/exception-types';
import { Collection } from '../entities/collection.entity';
import { CollectionRepository } from '../repositories/collection.repository';
import { CollectionPaginationDto } from '../dto/collection-pagination-request.dto';
import { ItemPaginationDto } from 'src/items/dto/pagination-request.dto';
import { PriceRangeDto } from 'src/items/dto/price-range.dto';

@Injectable()
export class CollectionService {
  constructor(
    private collectionRepository: CollectionRepository,
    private accountRepository: AccountRepository,
    private itemsRepository: ItemRepository
  ) {}

  async findPaginationCollection(paginationValues: CollectionPaginationDto) {
    return this.collectionRepository.pagination(paginationValues);
  }

  async getNewest(qty: number) {
    const { totalCount, collections } = await this.collectionRepository.getNewest(qty);
    for await (const collection of collections) {
      collection.items = await this.itemsRepository.getNewestByCollection(collection.id, 1);
    }
    return {
      totalCount,
      collections,
    };
  }

  async findById(id: string) {
    return this.collectionRepository.findById(id);
  }

  async findByOwner(address: string): Promise<Collection[]> {
    const account = await this.accountRepository.findByAddress(address);

    if (!account) throw new BusinessException(BusinessErrors.address_not_associated);

    return this.collectionRepository.findByOwner(account);
  }

  async findCollectionsListByOwner(address: string): Promise<Collection[]> {
    const account = await this.accountRepository.findByAddress(address);

    if (!account) throw new BusinessException(BusinessErrors.address_not_associated);

    return this.collectionRepository.findCollectionsListByOwner(account);
  }

  async findNftsOnCollection(id: string, filters: ItemPaginationDto) {
    const collection = await this.itemsRepository.nftsCollectionPagination(id, filters);

    if (!collection) throw new BusinessException(BusinessErrors.collection_not_associated);

    return collection;
  }

  async findPriceRange(collectionId: string): Promise<PriceRangeDto> {
    return this.itemsRepository.findPriceRangeCollectionItems(collectionId);
  }
}
