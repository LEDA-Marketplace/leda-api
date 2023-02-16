import { AccountsController } from '../controllers/account.controller';
import { Test } from '@nestjs/testing';
import { Item } from '../../items/entities/item.entity';
import { ItemStatus } from '../../items/enums/item-status.enum';
import { Account } from '../entities/account.entity';
import { Collection, Image } from '../../config/entities.config';
import { ItemService } from '../../items/services/item.service';
import { Voucher } from '../../items/entities/voucher.entity';
import { CollectionService } from '../../collections/services/collection.service';

const itemServiceMock = () => ({
  findByAddress: jest.fn(),
});

const collectionServiceMock = () => ({
  create: jest.fn(),
  findPagination: jest.fn(),
  findByOwner: jest.fn(),
});

describe('AccountController', () => {
  let controller: AccountsController;
  let itemService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [AccountsController],
      providers: [
        { provide: ItemService, useFactory: itemServiceMock },
        { provide: CollectionService, useFactory: collectionServiceMock },
      ],
    }).compile();

    controller = await module.get(AccountsController);
    itemService = await module.get(ItemService);
  });

  describe('When calling findItems function', () => {
    describe('and the address is valid', () => {
      it('should return an array of items', async () => {
        const expected: Item[] = [
          {
            itemId: '1',
            name: 'test',
            description: 'test',
            price: '1',
            royalty: 1,
            tags: [],
            collectionAddress: '',
            itemProperties: [],
            status: ItemStatus.Listed,
            tokenId: 1,
            listId: 1,
            collection: {} as Collection,
            author: {} as Account,
            owner: {} as Account,
            image: {} as Image,
            likes: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
            history: [],
            itemLikes: [],
            voucher: {} as Voucher,
            isLazy: false,
            isHidden: false,
            stakingRewards: 0,
          },
        ];

        const mockData = expected.map((prop) => ({ ...prop }));
        itemService.findByAddress.mockResolvedValue(mockData);

        const actual = await controller.findItems('123');

        expect(actual[0].itemId).toEqual(expected[0].itemId);
      });
    });
  });
});
