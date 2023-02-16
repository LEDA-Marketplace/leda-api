import { Injectable } from '@nestjs/common';
import { formatImageUrl } from '../../common/utils/image-utils';
import {
  Between,
  DataSource,
  FindManyOptions,
  FindOptionsWhere,
  Not,
  Raw,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { Account } from '../../account/entities/account.entity';
import { Collection } from '../../collections/entities/collection.entity';
import { DraftItemRequestDto } from '../dto/draft-item-request.dto';
import { ItemRequestDto } from '../dto/item-request.dto';
import { LazyItemRequestDto } from '../dto/lazy-item-request.dto';
import { ItemPaginationDto } from '../dto/pagination-request.dto';
import { PriceRangeDto } from '../dto/price-range.dto';
import { History } from '../entities/history.entity';
import { Image } from '../entities/image.entity';
import { ItemProperty } from '../entities/item-property.entity';
import { Item } from '../entities/item.entity';
import { Tag } from '../entities/tag.entity';
import { ItemStatus } from '../enums/item-status.enum';
import { TransactionType } from '../enums/transaction-type.enum';

@Injectable()
export class ItemRepository extends Repository<Item> {
  constructor(private dataSource: DataSource) {
    super(Item, dataSource.createEntityManager());
  }

  private getItemQueryBuilder(): SelectQueryBuilder<Item> {
    return this.createQueryBuilder('item')
      .select([
        'item.itemId',
        'item.tokenId',
        'item.listId',
        'item.name',
        'item.description',
        'item.price',
        'item.royalty',
        'item.likes',
        'item.isHidden',
        'item.status',
        'item.isLazy',
        'item.collectionAddress',
        'item.isHidden',
        'item.stakingRewards',
        'image.url',
        'image.cid',
        'item.createdAt',
        'item.updatedAt',
        'owner.accountId',
        'owner.address',
        'tag.name',
        'tag.id',
        'author.accountId',
        'author.address',
        'property.key',
        'property.value',
        'collection.id',
        'collection.name',
        'collection.description',
      ])
      .innerJoin('item.owner', 'owner')
      .innerJoin('item.tags', 'tag')
      .innerJoin('item.author', 'author')
      .leftJoin('item.itemProperties', 'property')
      .leftJoin('item.collection', 'collection')
      .leftJoin('item.image', 'image');
  }

  async getNewest(qty: number): Promise<Item[]> {
    return await this.getItemQueryBuilder()
      .where('item.status = :status', { status: ItemStatus.Listed })
      .andWhere('item.isHidden != :isHidden', { isHidden: true })
      .orderBy('item.updatedAt', 'DESC')
      .take(qty)
      .getMany();
  }

  async nftsCollectionPagination(collectionId: string, paginationDto: ItemPaginationDto) {
    const { limit, skip, likesOrder } = paginationDto;

    const queryOptions = {
      relations: {
        image: true,
        owner: true,
        author: true,
        collection: true,
        tags: true,
      },
      select: {
        image: { url: true },
        owner: { accountId: true, address: true },
        collection: { id: true },
        author: { accountId: true, address: true },
        tags: { name: true, id: true },
      },
      where: [
        {
          collection: new Collection(collectionId),
          isHidden: false,
          status: Not(ItemStatus.Draft),
        },
      ] as FindOptionsWhere<Item>[],
      take: limit,
      skip: skip,
    } as FindManyOptions<Item>;

    const conditions = this.getPaginationNftsConditions(collectionId, paginationDto);

    queryOptions.where = conditions;

    queryOptions.order = {
      ...queryOptions.order,
      createdAt: 'desc',
      tokenId: 'desc',
    };

    if (likesOrder) {
      queryOptions.order = {
        likes: likesOrder,
      };
    }

    const [result, totalCount] = await this.findAndCount(queryOptions);

    return {
      totalCount,
      page: paginationDto.page,
      limit: paginationDto.limit,
      items: result,
    };
  }

  async findAll(): Promise<Item[]> {
    return this.getItemQueryBuilder()
      .where('item.isHidden != :isHidden', { isHidden: true })
      .andWhere('item.status != :status', { status: ItemStatus.Draft })
      .orderBy('item.createdAt', 'DESC')
      .getMany();
  }

  async findByAccount(accountId: string): Promise<Item[]> {
    return this.getItemQueryBuilder()
      .where('item.status != :status', { status: ItemStatus.Draft })
      .andWhere('(item.ownerId = :accountId OR item.authorId = :accountId)', { accountId })
      .orderBy('item.createdAt', 'DESC')
      .getMany();
  }

  async findLikedByAccount(accountId: string): Promise<Item[]> {
    return this.getItemQueryBuilder()
      .innerJoin('item.itemLikes', 'itemLikes')
      .where('itemLikes.accountId = :accountId', { accountId })
      .andWhere('item.status != :status', { status: ItemStatus.Draft })
      .orderBy('item.createdAt', 'DESC')
      .getMany();
  }

  async findById(itemId: string): Promise<Item> {
    return this.getItemQueryBuilder().where('item.itemId = :itemId', { itemId }).getOne();
  }

  async findActiveById(itemId: string): Promise<Item> {
    return this.getItemQueryBuilder()
      .where('item.itemId = :itemId', { itemId })
      .andWhere('item.status != :status', { status: ItemStatus.Draft })
      .andWhere('item.isHidden = :isHidden', { isHidden: false })
      .getOne();
  }

  async findDraftById(itemId: string): Promise<Item> {
    return this.getItemQueryBuilder()
      .where('item.itemId = :itemId', { itemId })
      .andWhere('item.status = :status', { status: ItemStatus.Draft })
      .getOne();
  }

  async findPriceRange(): Promise<PriceRangeDto> {
    const query = this.createQueryBuilder('item')
      .where('item.status = :status', {
        status: ItemStatus.Listed,
      })
      .andWhere('item.isHidden != :isHidden', { isHidden: true })
      .andWhere('item.price IS NOT NULL');

    const cheapestQuery = query.clone().orderBy('CAST(item.price AS DOUBLE PRECISION)', 'ASC');
    const expensiveQuery = query.clone().orderBy('CAST(item.price AS DOUBLE PRECISION)', 'DESC');

    const { price: from } = await cheapestQuery.limit(1).getOneOrFail();
    const { price: to } = await expensiveQuery.limit(1).getOneOrFail();

    return { from: +from, to: +to };
  }

  async findPriceRangeCollectionItems(collectionId: string): Promise<PriceRangeDto> {
    const query = this.createQueryBuilder('item')
      .innerJoin('item.collection', 'collection')
      .where('item.isHidden != :isHidden', { isHidden: true })
      .andWhere('item.status != :status', { status: ItemStatus.Draft })
      .andWhere('item.price IS NOT NULL')
      .andWhere('collection.id = :collectionId', { collectionId });

    const collectionItems = await this.find({
      where: { collection: new Collection(collectionId) },
    });

    const itemsWithPrice = collectionItems.filter((item) => item.price !== null);

    if (!itemsWithPrice.length) {
      return { from: -1, to: -1 };
    }
    const cheapestQuery = query.clone().orderBy('CAST(item.price AS DOUBLE PRECISION)', 'ASC');
    const expensiveQuery = query.clone().orderBy('CAST(item.price AS DOUBLE PRECISION)', 'DESC');

    const { price: from } = await cheapestQuery.limit(1).getOneOrFail();
    const { price: to } = await expensiveQuery.limit(1).getOneOrFail();

    return { from: +from, to: +to };
  }

  async listAnItem(itemId: string, listId: number, price: string): Promise<void> {
    await this.update(
      {
        itemId,
      },
      { price, listId, status: ItemStatus.Listed, updatedAt: new Date() }
    );
  }

  async listLazyItem(itemId: string, price: string): Promise<void> {
    await this.update(
      {
        itemId,
      },
      { price, status: ItemStatus.Listed, updatedAt: new Date() }
    );
  }

  async delistAnItem(itemId: string): Promise<void> {
    await this.update(
      {
        itemId,
      },
      { status: ItemStatus.NotListed, updatedAt: new Date() }
    );
  }

  async buyItem(itemId: string, accountId: string): Promise<void> {
    await this.update(
      {
        itemId,
      },
      {
        owner: new Account(accountId),
        status: ItemStatus.NotListed,
        updatedAt: new Date(),
      }
    );
  }

  async transfer(itemId: string, accountId: string, tokenId: number): Promise<void> {
    await this.update(
      {
        itemId,
      },
      {
        owner: new Account(accountId),
        status: ItemStatus.NotListed,
        isLazy: false,
        tokenId,
        updatedAt: new Date(),
        price: null,
      }
    );
  }

  async updateLikesOnItem(itemId: string, likes: number) {
    await this.update({ itemId }, { likes });
  }

  getNewestByCollection(collectionId: string, take: number): Promise<Item[]> {
    return this.find({
      relations: { image: true, owner: true },
      where: { collection: new Collection(collectionId) },
      order: { createdAt: 'desc' },
      take,
    });
  }

  async pagination(paginationDto: ItemPaginationDto) {
    const { limit, skip, likesOrder } = paginationDto;

    const queryOptions = {
      relations: {
        image: true,
        owner: true,
        author: true,
        tags: true,
        collection: true,
      },
      select: {
        image: { url: true },
        owner: { accountId: true, address: true },
        author: { accountId: true, address: true },
        tags: { name: true, id: true },
        collection: { id: true },
      },
      where: [] as FindOptionsWhere<Item>[],
      take: limit,
      skip: skip,
    } as FindManyOptions<Item>;

    const conditions = this.getPaginationConditions(paginationDto);

    queryOptions.where = conditions;

    if (likesOrder) {
      queryOptions.order = {
        likes: likesOrder,
      };
    }

    queryOptions.order = {
      ...queryOptions.order,
      createdAt: 'desc',
      tokenId: 'desc',
    };

    const [result, totalCount] = await this.findAndCount(queryOptions);
    return {
      totalCount,
      page: paginationDto.page,
      limit: paginationDto.limit,
      items: result,
    };
  }

  async createItem(itemRequest: DraftItemRequestDto, account: Account): Promise<Item> {
    const tags = itemRequest.tags.map((tag) => {
      const newTag = new Tag();
      newTag.name = tag;
      return newTag;
    });

    const itemProperties = itemRequest.itemProperties.map((itemProp) => {
      const newProp = new ItemProperty();
      newProp.key = itemProp.key;
      newProp.value = itemProp.value;
      return newProp;
    });

    const item = this.create({
      name: itemRequest.name,
      description: itemRequest.description,
      collectionAddress: itemRequest.collectionAddress,
      tags,
      itemProperties,
      royalty: itemRequest.royalty,
      author: new Account(account.accountId),
      owner: new Account(account.accountId),
      price: itemRequest.price || null,
      tokenId: itemRequest.tokenId,
      stakingRewards: itemRequest.stakingRewards,
    });

    await this.save(item);

    item.owner.address = account.address;
    item.author.address = account.address;

    return item;
  }

  async hasAccountLikedAnItem(accountId: string, itemId: string): Promise<boolean> {
    const number = await this.createQueryBuilder('item')
      .innerJoin('item.itemLikes', 'itemLike')
      .where('itemLike.accountId = :accountId', { accountId })
      .andWhere('item.itemId = :itemId', { itemId })
      .andWhere('item.status != :status', { status: ItemStatus.Draft })
      .getCount();

    return number > 0;
  }

  async activate(item: Item, itemRequest: ItemRequestDto, collection: Collection): Promise<Item> {
    const { tokenId, image } = itemRequest;

    item.tokenId = tokenId;
    item.status = ItemStatus.NotListed;
    item.image = { url: formatImageUrl(image.url), cid: image.cid } as Image;
    item.collection = new Collection(collection.id);

    const history = {
      transactionType: TransactionType.Created,
      owner: new Account(item.author.accountId),
    } as History;

    item.history = [history];

    await this.save(item);
    return item;
  }

  async activateLazyItem(
    item: Item,
    lazyItemRequest: LazyItemRequestDto,
    collection: Collection
  ): Promise<Item> {
    const { image } = lazyItemRequest;

    item.status = ItemStatus.Listed;
    item.isLazy = true;
    item.image = { url: formatImageUrl(image.url), cid: image.cid } as Image;
    item.collection = new Collection(collection.id);

    const history = {
      transactionType: TransactionType.Created,
      owner: new Account(item.author.accountId),
    } as History;

    item.history = [history];

    await this.save(item);
    return item;
  }

  async hideAndUnhide(item: Item): Promise<Item> {
    item.isHidden = item.isHidden ? false : true;

    await this.save({
      itemId: item.itemId,
      isHidden: item.isHidden,
    });

    return item;
  }

  private getPaginationConditions(paginationDto: ItemPaginationDto): FindOptionsWhere<Item>[] {
    const { priceFrom, priceTo, search } = paginationDto;
    const conditions = [] as FindOptionsWhere<Item>[];
    const condition1 = {
      status: ItemStatus.Listed,
      isHidden: false,
    } as FindOptionsWhere<Item>;

    if (priceFrom && priceTo) {
      condition1.status = ItemStatus.Listed;
      condition1.price = Raw(
        (alias) =>
          `CAST(${alias} as DOUBLE PRECISION) >= ${priceFrom} and CAST(${alias} as DOUBLE PRECISION) <= ${priceTo}`
      );
    }

    const condition2 = { ...condition1 };

    if (search) {
      condition1.name = Raw(
        (alias) => `LOWER(${alias}) Like '%${paginationDto.search?.toLowerCase()}%'`
      );

      condition2.description = Raw(
        (alias) => `LOWER(${alias}) Like '%${paginationDto.search?.toLowerCase()}%'`
      );
    }

    // This query will result on the following structure:
    // (status = 1 and price between x and y and name like '%value%') OR
    // (status = 1 and price between x and y and description like '%value%')
    conditions.push(condition1);
    conditions.push(condition2);

    return conditions;
  }

  private getPaginationNftsConditions(
    collectionId: string,
    paginationDto: ItemPaginationDto
  ): FindOptionsWhere<Item>[] {
    const { priceFrom, priceTo, search } = paginationDto;
    const conditions = [] as FindOptionsWhere<Item>[];
    const condition1 = {
      collection: new Collection(collectionId),
      isHidden: false,
    } as FindOptionsWhere<Item>;

    const condition2 = { ...condition1 };

    if (priceFrom && priceTo) {
      condition1.status = ItemStatus.Listed;
      condition1.price = Raw(
        (alias) =>
          `CAST(${alias} as DOUBLE PRECISION) >= ${priceFrom} and CAST(${alias} as DOUBLE PRECISION) <= ${priceTo}`
      );
    }
    condition2.status = ItemStatus.NotListed;

    if (search) {
      condition1.name = Raw(
        (alias) => `LOWER(${alias}) Like '%${paginationDto.search?.toLowerCase()}%'`
      );

      condition2.description = Raw(
        (alias) => `LOWER(${alias}) Like '%${paginationDto.search?.toLowerCase()}%'`
      );
    }

    // This query will result on the following structure:
    // (status = 1 and price between x and y and name like '%value%') OR
    // (status = 1 and price between x and y and description like '%value%')
    conditions.push(condition1);
    conditions.push(condition2);

    return conditions;
  }
}
