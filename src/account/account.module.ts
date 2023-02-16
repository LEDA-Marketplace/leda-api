import { AccountRepository } from './repositories/account.repository';
import { AccountsController } from './controllers/account.controller';
import { ItemModule } from '../items/item.module';
import { Module } from '@nestjs/common';
import { CollectionRepository } from '../collections/repositories/collection.repository';
import { CollectionService } from '../collections/services/collection.service';

@Module({
  imports: [ItemModule],
  controllers: [AccountsController],
  providers: [AccountRepository, CollectionRepository, CollectionService],
  exports: [AccountRepository],
})
export class AccountModule {}
