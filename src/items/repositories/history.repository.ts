import { Injectable } from '@nestjs/common';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { DataSource, Repository } from 'typeorm';
import { Account } from '../../config/entities.config';
import { History } from '../entities/history.entity';
import { Item } from '../entities/item.entity';
import { TransactionType } from '../enums/transaction-type.enum';

@Injectable()
export class HistoryRepository extends Repository<History> {
  constructor(private dataSource: DataSource) {
    super(History, dataSource.createEntityManager());
  }

  async pagination(paginationDto: PaginationDto) {
    const { limit, skip } = paginationDto;

    const [history, count] = await this.findAndCount({
      relations: {
        item: {
          image: true,
        },
        owner: true,
      },
      where: {
        item: {
          isHidden: false,
        },
      },
      order: {
        createdAt: 'DESC',
      },
      take: limit,
      skip,
    });

    return {
      count,
      history,
    };
  }

  async findAllByItemId(itemId: string): Promise<History[]> {
    return this.find({
      where: {
        item: new Item(itemId),
      },
      relations: ['item', 'owner', 'item.image'],
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async createHistory({
    accountId,
    itemId,
    transactionType,
    price,
    listId,
  }: {
    accountId: string;
    itemId: string;
    transactionType: TransactionType;
    price?: string;
    listId?: number;
  }): Promise<History> {
    const data = this.create({
      price,
      transactionType,
      listId,
      item: new Item(itemId),
      owner: new Account(accountId),
    });

    await this.save(data);

    return data;
  }
}
