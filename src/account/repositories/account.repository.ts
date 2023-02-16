import { Account } from '../entities/account.entity';
import { DataSource, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AccountRepository extends Repository<Account> {
  constructor(private dataSource: DataSource) {
    super(Account, dataSource.createEntityManager());
  }

  async findByAddress(address: string): Promise<Account | undefined> {
    const account = await this.createQueryBuilder('account')
      .select(['account.accountId', 'account.address'])
      .where('account.address = :address', { address: address.toLocaleLowerCase() })
      .getOne();

    if (!account) return;

    return account;
  }
}
