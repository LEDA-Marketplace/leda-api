import { Injectable } from '@nestjs/common';
import { CreateCollectionDto } from 'src/collections/dto/create-collection.dto';
import { Collection } from 'src/config/entities.config';
import { Account } from '../../account/entities/account.entity';
import { AccountRepository } from '../../account/repositories/account.repository';
import { CollectionRepository } from '../../collections/repositories/collection.repository';
import { BusinessErrors } from '../../common/constants';
import { BusinessException, NotFoundException } from '../../common/exceptions/exception-types';
import { BuyRequestDto } from '../dto/buy-request.dto';
import { DelistItemRequestDto } from '../dto/delist-item-request.dto';
import { DraftItemRequestDto } from '../dto/draft-item-request.dto';
import { ItemRequestDto } from '../dto/item-request.dto';
import { LazyItemRequestDto } from '../dto/lazy-item-request.dto';
import { ListItemRequestDto } from '../dto/list-item-request.dto';
import { ItemPaginationDto } from '../dto/pagination-request.dto';
import { PriceRangeDto } from '../dto/price-range.dto';
import { TransferDto } from '../dto/transfer-request.dto';
import { Item } from '../entities/item.entity';
import { Voucher } from '../entities/voucher.entity';
import { ItemStatus } from '../enums/item-status.enum';
import { LazyProcessType } from '../enums/lazy-process-type.enum';
import { TransactionType } from '../enums/transaction-type.enum';
import { HistoryRepository } from '../repositories/history.repository';
import { ItemLikeRepository } from '../repositories/item-like.repository';
import { ItemRepository } from '../repositories/item.repository';
import { VoucherRepository } from '../repositories/voucher.repository';

@Injectable()
export class ItemService {
  constructor(
    private itemRepository: ItemRepository,
    private accountRepository: AccountRepository,
    private historyRepository: HistoryRepository,
    private itemLikeRepository: ItemLikeRepository,
    private voucherRepository: VoucherRepository,
    private collectionRepository: CollectionRepository
  ) {}

  async findAll(): Promise<Item[]> {
    return this.itemRepository.findAll();
  }

  async getNewest(qty: number): Promise<Item[]> {
    return this.itemRepository.getNewest(qty);
  }

  async findPagination(paginationValues: ItemPaginationDto) {
    return this.itemRepository.pagination(paginationValues);
  }

  async findById(itemId: string): Promise<Item> {
    const item = await this.itemRepository.findById(itemId);

    if (!item) throw new NotFoundException(`The item with id ${itemId} does not exist`);

    return item;
  }

  async findByAddress(address: string): Promise<Item[]> {
    const account = await this.accountRepository.findByAddress(address);

    if (!account) throw new BusinessException(BusinessErrors.address_not_associated);

    return this.itemRepository.findByAccount(account.accountId);
  }

  async findLikedByAddress(address: string): Promise<Item[]> {
    const account = await this.accountRepository.findByAddress(address);

    if (!account) throw new BusinessException(BusinessErrors.address_not_associated);

    return this.itemRepository.findLikedByAccount(account.accountId);
  }

  async findPriceRange(): Promise<PriceRangeDto> {
    return this.itemRepository.findPriceRange();
  }

  async findVoucherByItemId(itemId: string): Promise<Voucher> {
    const item = await this.itemRepository.findActiveById(itemId);
    if (!item) throw new NotFoundException(`The item with id ${itemId} does not exist`);

    const voucher = await this.voucherRepository.findVoucherByItemId(itemId);

    return voucher;
  }

  async create(itemRequest: DraftItemRequestDto): Promise<Item> {
    const account = await this.accountRepository.findByAddress(itemRequest.address);

    if (!account) throw new BusinessException(BusinessErrors.address_not_associated);

    return this.itemRepository.createItem(itemRequest, account);
  }

  async buyItem({ itemId, address: newOwnerAddress }: BuyRequestDto): Promise<Item> {
    const item = await this.itemRepository.findActiveById(itemId);
    if (!item) throw new NotFoundException(`The item with id ${itemId} does not exist`);

    const account = await this.accountRepository.findByAddress(newOwnerAddress);
    if (!account)
      throw new NotFoundException(`The account with address ${newOwnerAddress} does not exist`);

    await this.itemRepository.buyItem(itemId, account.accountId);

    item.owner.address = account.address;
    item.status = ItemStatus.NotListed;

    await this.historyRepository.createHistory({
      itemId,
      price: item.price,
      accountId: account.accountId,
      transactionType: TransactionType.Sold,
      listId: item.listId,
    });

    item.history = await this.historyRepository.findAllByItemId(item.itemId);

    return item;
  }

  async listAnItem({ address, itemId, listId, price }: ListItemRequestDto): Promise<Item> {
    const item = await this.itemRepository.findActiveById(itemId);
    if (!item) throw new NotFoundException(`The item with id ${itemId} does not exist`);

    const account = await this.accountRepository.findByAddress(address);
    if (!account) throw new NotFoundException(`The account with address ${address} does not exist`);

    await this.itemRepository.listAnItem(itemId, listId, price);

    item.price = price;
    item.listId = listId;
    item.status = ItemStatus.Listed;

    await this.historyRepository.createHistory({
      itemId,
      price,
      accountId: account.accountId,
      transactionType: TransactionType.Listed,
      listId,
    });

    item.history = await this.historyRepository.findAllByItemId(item.itemId);

    return item;
  }

  async listLazyItem(item: Item, accountId: string, price: string): Promise<Item> {
    await this.itemRepository.listLazyItem(item.itemId, price);

    item.price = price;
    item.status = ItemStatus.Listed;

    await this.historyRepository.createHistory({
      itemId: item.itemId,
      price,
      accountId,
      transactionType: TransactionType.Listed,
    });

    item.history = await this.historyRepository.findAllByItemId(item.itemId);

    return item;
  }

  async delistAnItem({ itemId, address }: DelistItemRequestDto): Promise<Item> {
    const item = await this.itemRepository.findActiveById(itemId);
    if (!item) throw new NotFoundException(`The item with id ${itemId} does not exist`);

    const account = await this.accountRepository.findByAddress(address);
    if (!account) throw new NotFoundException(`The account with address ${address} does not exist`);

    await this.itemRepository.delistAnItem(itemId);

    await this.historyRepository.createHistory({
      itemId,
      accountId: account.accountId,
      transactionType: TransactionType.Delisted,
      listId: item.listId,
    });

    item.status = ItemStatus.NotListed;

    item.history = await this.historyRepository.findAllByItemId(item.itemId);

    return item;
  }

  async delistLazyItem(item: Item, accountId: string): Promise<Item> {
    await this.itemRepository.delistAnItem(item.itemId);

    await this.historyRepository.createHistory({
      itemId: item.itemId,
      accountId: accountId,
      transactionType: TransactionType.Delisted,
    });

    item.status = ItemStatus.NotListed;
    item.history = await this.historyRepository.findAllByItemId(item.itemId);

    return item;
  }

  async like(itemId: string, address: string): Promise<Item> {
    const itemToLike = await this.itemRepository.findActiveById(itemId);
    const history = await this.historyRepository.findAllByItemId(itemId);

    if (!itemToLike) throw new NotFoundException(`The item with id ${itemId} does not exist`);

    const account = await this.accountRepository.findByAddress(address);
    if (!account) throw new NotFoundException(`The account with address ${address} does not exist`);

    const currentLikes = await this.itemLikeRepository.getTotalOfLikesFromItem(itemId);

    const hasAccountLiked = await this.itemRepository.hasAccountLikedAnItem(
      account.accountId,
      itemId
    );

    if (hasAccountLiked) {
      await this.itemLikeRepository.delete({
        item: new Item(itemId),
        account: new Account(account.accountId),
      });

      itemToLike.likes = currentLikes - 1;
    } else {
      await this.itemLikeRepository.createItemLike(itemId, account.accountId);

      itemToLike.likes = currentLikes + 1;
    }
    await this.itemRepository.updateLikesOnItem(itemId, itemToLike.likes);

    const item = { ...itemToLike, history };
    return item;
  }

  async activate(itemId: string, itemRequest: ItemRequestDto): Promise<Item> {
    const account = await this.accountRepository.findByAddress(itemRequest.address);

    if (!account) throw new BusinessException(BusinessErrors.address_not_associated);

    const item = await this.itemRepository.findById(itemId);
    if (!item) throw new NotFoundException(`The item with id ${itemId} does not exist`);

    const collection = await this.getCollection(itemRequest?.collection as Collection, account);

    return this.itemRepository.activate(item, itemRequest, collection);
  }

  async getCollection(collectionDto: CreateCollectionDto, account: Account) {
    if (!collectionDto?.name?.length) {
      const defaultCollection = await this.collectionRepository.getDefaultCollection();
      return defaultCollection;
    }

    const collection = await this.collectionRepository.findByName(collectionDto.name, account);

    if (collection) return collection;

    return this.collectionRepository.createCollection(
      {
        name: collectionDto.name,
        description: collectionDto.description,
        image: collectionDto.image,
      },
      account
    );
  }

  async processLazyItem(itemId: string, lazyItemRequest: LazyItemRequestDto): Promise<Item> {
    const account = await this.accountRepository.findByAddress(lazyItemRequest.address);

    if (!account) throw new BusinessException(BusinessErrors.address_not_associated);
    const item = await this.itemRepository.findById(itemId);
    if (!item) throw new NotFoundException(`The item with id ${itemId} does not exist`);

    if (lazyItemRequest.lazyProcessType === LazyProcessType.Activation)
      return this.processLazyActivation(item, lazyItemRequest, account);

    if (lazyItemRequest.lazyProcessType === LazyProcessType.Listing)
      return this.processLazyListing(item, lazyItemRequest, account);

    if (lazyItemRequest.lazyProcessType === LazyProcessType.Delisting)
      return this.processLazyDelisting(item, account);

    throw new BusinessException(BusinessErrors.lazy_process_type_not_defined);
  }

  async processLazyActivation(item: Item, lazyItemRequest: LazyItemRequestDto, account: Account) {
    await this.voucherRepository.createVoucher(item, lazyItemRequest, account);
    const collection = await this.getCollection(lazyItemRequest?.collection as Collection, account);
    return this.itemRepository.activateLazyItem(item, lazyItemRequest, collection);
  }

  async processLazyListing(item: Item, lazyItemRequest: LazyItemRequestDto, account: Account) {
    await this.voucherRepository.deleteVoucher(account.accountId, item.itemId);
    await this.voucherRepository.createVoucher(item, lazyItemRequest, account);
    return this.listLazyItem(item, account.accountId, lazyItemRequest.price);
  }

  async processLazyDelisting(item: Item, account: Account) {
    await this.voucherRepository.deleteVoucher(account.accountId, item.itemId);
    return this.delistLazyItem(item, account.accountId);
  }

  async transfer(itemId: string, transfer: TransferDto) {
    const voucher = await this.voucherRepository.findOneBy({ voucherId: transfer.voucherId });
    if (!voucher) throw new BusinessException(BusinessErrors.voucher_not_found);

    await this.voucherRepository.delete(transfer.voucherId);

    const item = await this.itemRepository.findById(itemId);
    if (!item) throw new NotFoundException(`The item with id ${itemId} does not exist`);

    const account = await this.accountRepository.findByAddress(transfer.owner);
    if (!account) throw new BusinessException(BusinessErrors.address_not_associated);

    await this.itemRepository.transfer(itemId, account.accountId, transfer.tokenId);
  }

  async hideAndUnhide(itemId: string): Promise<Item> {
    const item = await this.itemRepository.findById(itemId);

    item.history = await this.historyRepository.findAllByItemId(itemId);

    if (!item) throw new NotFoundException(`The item with id ${itemId} does not exist`);

    return this.itemRepository.hideAndUnhide(item);
  }
}
