import { ItemRequestDto } from '../dto/item-request.dto';
import { ItemPaginationDto } from '../dto/pagination-request.dto';
import { Item } from '../entities/item.entity';
import {
  DataSource,
  FindManyOptions,
  FindOptionsWhere,
  Raw,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { Injectable } from '@nestjs/common';
import { Account } from '../../config/entities.config';
import { ItemStatus } from '../enums/item-status.enum';
import { Between } from 'typeorm';

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
        'item.status',
        'image.url',
        'item.createdAt',
        'owner.accountId',
        'owner.address',
        'author.accountId',
        'author.address',
      ])
      .innerJoin('item.image', 'image')
      .innerJoin('item.owner', 'owner')
      .innerJoin('item.author', 'author');
  }

  async findAll(): Promise<Item[]> {
    return this.getItemQueryBuilder()
      .where('item.status=:status', { status: ItemStatus.Listed })
      .orderBy('item.createdAt', 'DESC')
      .getMany();
  }

  async findByAccount(accountId: string): Promise<Item[]> {
    return this.getItemQueryBuilder()
      .where('item.ownerId = :accountId OR item.authorId = :accountId', { accountId })
      .orderBy('item.createdAt', 'DESC')
      .getMany();
  }

  async findById(itemId: string): Promise<Item> {
    return this.getItemQueryBuilder()
      .where('item.itemId = :itemId', { itemId })
      .orderBy('item.createdAt', 'DESC')
      .getOne();
  }

  async listAnItem(itemId: string, listId: number, price: string): Promise<void> {
    await this.update(
      {
        itemId,
      },
      { price, listId, status: ItemStatus.Listed, updatedAt: new Date() }
    );
  }

  async buyItem(itemId: string, accountId: string): Promise<void> {
    await this.update(
      {
        itemId,
      },
      { owner: new Account(accountId), status: ItemStatus.NotListed, updatedAt: new Date() }
    );
  }

  async pagination(paginationDto: ItemPaginationDto) {
    const { limit, skip } = paginationDto;

    const queryOptions = {
      relations: {
        image: true,
        owner: true,
        author: true,
      },
      select: {
        image: { url: true },
        owner: { accountId: true },
        author: { accountId: true, address: true },
      },
      where: [] as FindOptionsWhere<Item>[],
      take: limit,
      skip: skip,
      order: {
        likes: paginationDto.likesOrder,
        createdAt: 'desc',
        tokenId: 'desc',
      },
    } as FindManyOptions<Item>;

    const conditions = this.getPaginationConditions(paginationDto);

    queryOptions.where = conditions;

    const [result, totalCount] = await this.findAndCount(queryOptions);

    return {
      totalCount,
      page: paginationDto.page,
      limit: paginationDto.limit,
      items: result,
    };
  }

  async createItem(itemRequestDto: ItemRequestDto, account: Account): Promise<Item> {
    const { tokenId, name, collectionAddress, description, royalty, status, image, wei } =
      itemRequestDto;

    const { accountId, address } = account;

    const item = this.create({
      tokenId,
      collectionAddress,
      name,
      description,
      price: wei,
      royalty,
      status,
      image: { url: image.url, cid: image.cid },
      author: new Account(accountId),
      owner: new Account(accountId),
      createdAt: new Date(),
      updatedAt: new Date(),
      likes: 0,
    });

    await this.save(item);

    item.owner.address = address;
    item.author.address = address;

    return item;
  }

  private getPaginationConditions(paginationDto: ItemPaginationDto): FindOptionsWhere<Item>[] {
    const { priceFrom, priceTo, search } = paginationDto;
    const conditions = [] as FindOptionsWhere<Item>[];
    const condition1 = { status: ItemStatus.Listed } as FindOptionsWhere<Item>;

    if (priceFrom && priceTo) condition1.price = Between(String(priceFrom), String(priceTo));

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
}
