import { Account } from '../../account/entities/account.entity';
import { AccountRepository } from '../../account/repositories/account.repository';
import { BusinessErrors } from '../../common/constants';
import { BusinessException, NotFoundException } from '../../common/exceptions/exception-types';
import { History } from '../entities/history.entity';
import { HistoryRepository } from '../repositories/history.repository';
import { Image } from '../entities/image.entity';
import { Item } from '../entities/item.entity';
import { ItemPaginationDto } from '../dto/pagination-request.dto';
import { ItemRepository } from '../repositories/item.repository';
import { ItemService } from '../services/item.service';
import { ItemStatus } from '../enums/item-status.enum';
import { PriceRangeDto } from '../dto/price-range.dto';
import { Test, TestingModule } from '@nestjs/testing';
import { TransactionType } from '../enums/transaction-type.enum';
import { ItemLikeRepository } from '../repositories/item-like.repository';
import { DraftItemRequestDto } from '../dto/draft-item-request.dto';
import { ItemRequestDto } from '../dto/item-request.dto';
import { Voucher } from '../entities/voucher.entity';
import { VoucherRepository } from '../repositories/voucher.repository';
import { Collection } from '../../config/entities.config';
import { CollectionRepository } from '../../collections/repositories/collection.repository';

const itemRepositoryMock = () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  findActiveById: jest.fn(),
  findDraftById: jest.fn(),
  findByAccount: jest.fn(),
  findPriceRange: jest.fn(),
  pagination: jest.fn(),
  createItem: jest.fn(),
  listAnItem: jest.fn(),
  delistAnItem: jest.fn(),
  activate: jest.fn(),
});

const accountRepositoryMock = () => ({
  findByAddress: jest.fn(),
});

const historyRepositoryMock = () => ({
  findAll: jest.fn(),
  findAllByItemId: jest.fn(),
  createHistory: jest.fn(),
});

const itemLikeRepositoryMock = () => ({
  getTotalOfLikesFromItem: jest.fn(),
  createItemLike: jest.fn(),
});

const voucherRepository = () => ({
  createVoucher: jest.fn(),
});

const collectionRepositoryMock = () => ({
  pagination: jest.fn(),
  findById: jest.fn(),
  findByOwner: jest.fn(),
  createCollection: jest.fn(),
  getDefaultCollection: jest.fn(),
  findByName: jest.fn(),
  activate: jest.fn(),
});

describe('ItemService', () => {
  let service: ItemService;
  let itemRepository;
  let accountRepository;
  let historyRepository;
  let collectionRepository;
  let items: Item[] = [];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ItemService,
        { provide: ItemRepository, useFactory: itemRepositoryMock },
        { provide: AccountRepository, useFactory: accountRepositoryMock },
        { provide: HistoryRepository, useFactory: historyRepositoryMock },
        { provide: VoucherRepository, useFactory: voucherRepository },
        { provide: ItemLikeRepository, useFactory: itemLikeRepositoryMock },
        { provide: CollectionRepository, useFactory: collectionRepositoryMock },
      ],
    }).compile();

    service = await module.get(ItemService);
    itemRepository = await module.get(ItemRepository);
    accountRepository = await module.get(AccountRepository);
    historyRepository = await module.get(HistoryRepository);
    collectionRepository = await module.get(CollectionRepository);

    items = [
      {
        itemId: '1',
        name: 'test',
        description: 'test',
        price: '1',
        royalty: 1,
        tags: [],
        itemProperties: [],
        status: ItemStatus.NotListed,
        tokenId: 1,
        collectionAddress: 'test',
        collection: { name: 'collection', description: 'description' } as Collection,
        author: {} as Account,
        owner: {} as Account,
        image: {} as Image,
        listId: 1,
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
  });

  describe('When findAll function is called', () => {
    it('should return an array of items ', async () => {
      const expected = items;

      const mockedData = expected.map((prop) => ({ ...prop }));
      itemRepository.findAll.mockResolvedValue(mockedData);

      const actual = await service.findAll();

      expect(actual).toEqual(expected);
    });
  });

  describe('When findById function is called', () => {
    describe('and the itemId exist', () => {
      it('should return the expected item', async () => {
        const expected = {
          itemId: '1',
          name: 'test',
          description: 'test',
          price: '1',
          royalty: 1,
          tags: [],
          itemProperties: [],
          status: ItemStatus.NotListed,
          tokenId: 1,
          collectionAddress: 'test',
          collection: { name: 'collection', description: 'description' } as Collection,
          author: {} as Account,
          owner: {} as Account,
          image: {} as Image,
          listId: 1,
          likes: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          history: [],
          itemLikes: [],
        };

        itemRepository.findById.mockResolvedValue({ ...expected });

        const actual = await service.findById('123');

        expect(actual).toEqual(expected);
      });
    });

    describe('and the itemId does not exist', () => {
      it('should throw a NotFoundException with expected message', async () => {
        const unexistingId = '123';
        const errorMessage = `The item with id ${unexistingId} does not exist`;

        itemRepository.findActiveById.mockResolvedValue(null);

        const exception = () => service.findById(unexistingId);

        await expect(exception).rejects.toThrow(NotFoundException);
        await expect(exception).rejects.toEqual(new NotFoundException(errorMessage));
      });
    });
  });

  describe('When findByAddress function is called', () => {
    describe('and the address exist', () => {
      it('should return the expected item', async () => {
        const account = { accountId: '456' } as Account;
        const expected = items;

        accountRepository.findByAddress.mockResolvedValue({ ...account });

        const mockedData = expected.map((prop) => ({ ...prop }));
        itemRepository.findByAccount.mockResolvedValue(mockedData);

        const actual = await service.findByAddress('123');

        expect(actual).toEqual(expected);
      });
    });

    describe('and the address does not exist', () => {
      it('should throw a BusinessException with expected message', async () => {
        const unexistingAddress = '123';

        accountRepository.findByAddress.mockResolvedValue(null);

        const exception = () => service.findByAddress(unexistingAddress);

        await expect(exception).rejects.toThrow(BusinessException);
        await expect(exception).rejects.toEqual(
          new BusinessException(BusinessErrors.address_not_associated)
        );

        expect(itemRepository.findByAccount).not.toHaveBeenCalled();
      });
    });
  });

  describe('When findPagination function is called', () => {
    it('should return a pagination object ', async () => {
      const expected = {
        page: 1,
        limit: 10,
        items: items,
        totalCount: 1,
      };

      const paginationDto = {
        likesOrder: 'desc',
        priceFrom: 0.001,
        priceTo: 1,
      } as ItemPaginationDto;

      const mockedData = { ...expected };
      itemRepository.pagination.mockResolvedValue(mockedData);

      const actual = await service.findPagination(paginationDto);

      expect(itemRepository.pagination).toHaveBeenCalledWith(paginationDto);
      expect(actual).toEqual(expected);
    });
  });

  describe('When findPriceRange function is called', () => {
    it('should return the cheapest and most expensive prices', async () => {
      const expected = {
        from: 0.001,
        to: 100,
      } as PriceRangeDto;

      const mockedData = { ...expected };
      itemRepository.findPriceRange.mockResolvedValue(mockedData);

      const actual = await service.findPriceRange();

      expect(itemRepository.findPriceRange).toHaveBeenCalled();
      expect(actual).toEqual(expected);
    });
  });

  describe('When create function is called', () => {
    describe('and the account exist', () => {
      it('should return the expected item', async () => {
        const account = { accountId: '456' } as Account;
        const collection = { id: '1', name: 'name', description: 'description' } as Collection;
        const expected = items[0];

        collectionRepository.getDefaultCollection.mockResolvedValue({ ...collection });
        accountRepository.findByAddress.mockResolvedValue({ ...account });
        itemRepository.createItem.mockResolvedValue({ ...expected });
        collectionRepository.findByName.mockResolvedValue({ ...collection });
        collectionRepository.createCollection.mockResolvedValue({ ...collection });

        const actual = await service.create({
          address: '123',
          collection: { description: collection.description, name: collection.name },
        } as DraftItemRequestDto);

        expect(actual).toEqual(expected);
      });
    });

    describe('and the address does not exist', () => {
      it('should throw a BusinessException with expected message', async () => {
        const unexistingAddress = '123';

        accountRepository.findByAddress.mockResolvedValue(null);

        const exception = () => service.findByAddress(unexistingAddress);

        await expect(exception).rejects.toThrow(BusinessException);
        await expect(exception).rejects.toEqual(
          new BusinessException(BusinessErrors.file_extension_not_supported)
        );

        expect(itemRepository.createItem).not.toHaveBeenCalled();
      });
    });
  });

  describe('When listAnItem function is called', () => {
    describe('and the item exist', () => {
      it('should list the item and return it', async () => {
        const itemId = '123';
        const listId = 456;
        const price = '0.001';

        const expected = items[0];
        const history = [{ id: '123' }] as History[];
        expected.history = history;
        expected.price = price;
        expected.listId = listId;
        expected.status = ItemStatus.Listed;

        itemRepository.findActiveById.mockResolvedValue({ ...items[0] });
        accountRepository.findByAddress.mockResolvedValue({ account: { accountId: '1' } });
        historyRepository.findAllByItemId.mockResolvedValue(history);

        const actual = await service.listAnItem({
          itemId,
          listId,
          price,
          address: '',
        });

        expect(actual).toEqual(expected);
        expect(itemRepository.listAnItem).toHaveBeenCalled();
      });
    });

    describe('and the item does not exist', () => {
      it('should throw a NotFoundException with expected message', async () => {
        const unexistingId = '123';
        const errorMessage = `The item with id ${unexistingId} does not exist`;

        itemRepository.findActiveById.mockResolvedValue(null);

        const exception = () =>
          service.listAnItem({ address: '', itemId: unexistingId, listId: 1, price: '1' });

        await expect(exception).rejects.toThrow(NotFoundException);
        await expect(exception).rejects.toEqual(new NotFoundException(errorMessage));

        expect(itemRepository.listAnItem).not.toHaveBeenCalled();
      });
    });
  });

  describe('When delistAnItem function is called ', () => {
    describe('and the execution is successful', () => {
      it('should return an item with status NotListed', async () => {
        const itemId = '123';
        const address = 'address';

        const item = { listId: 1 } as Item;
        const account = { accountId: '1' } as Account;

        itemRepository.findActiveById.mockResolvedValue(item);

        accountRepository.findByAddress.mockResolvedValue(account);

        const expected = { ...item, status: ItemStatus.NotListed };

        const actual = await service.delistAnItem({ itemId, address });

        expect(itemRepository.delistAnItem).toHaveBeenCalledWith(itemId);
        expect(historyRepository.createHistory).toHaveBeenCalledWith({
          itemId,
          accountId: account.accountId,
          transactionType: TransactionType.Delisted,
          listId: item.listId,
        });
        expect(actual).toEqual(expected);
      });
    });
    describe('and the execution is unsuccessful', () => {
      it('throw a NotFoundException when item is not found', async () => {
        const unexistingItemId = '123';
        const unexistingAddress = 'address';
        const errorMessage = `The item with id ${unexistingItemId} does not exist`;

        itemRepository.findActiveById.mockResolvedValue(null);

        const exception = () =>
          service.delistAnItem({ itemId: unexistingItemId, address: unexistingAddress });

        await expect(exception).rejects.toThrow(NotFoundException);
        await expect(exception).rejects.toEqual(new NotFoundException(errorMessage));

        expect(itemRepository.delistAnItem).not.toHaveBeenCalled();
      });
      it('throw a NotFoundException when account is not found', async () => {
        const itemId = '123';
        const unexistingAddress = 'address';
        const errorMessage = `The account with address ${unexistingAddress} does not exist`;

        itemRepository.findActiveById.mockResolvedValue({} as Item);
        accountRepository.findByAddress.mockResolvedValue(null);

        const exception = () => service.delistAnItem({ itemId, address: unexistingAddress });

        await expect(exception).rejects.toThrow(NotFoundException);
        await expect(exception).rejects.toEqual(new NotFoundException(errorMessage));

        expect(itemRepository.delistAnItem).not.toHaveBeenCalled();
      });
    });
  });

  describe('When activate function is called', () => {
    describe('and the account and item exist', () => {
      it('should activate and return the expected item', async () => {
        const account = { accountId: '456' } as Account;
        const collection = {
          image: { url: 'url', cid: 'cid' },
          name: 'Leda',
          description: 'description',
        };
        const itemId = '123';
        const itemRequest = {
          address: '123',
          collection,
        } as ItemRequestDto;
        const expected = items[0];

        accountRepository.findByAddress.mockResolvedValue({ ...account });
        itemRepository.findById.mockResolvedValue({ ...expected });
        itemRepository.activate.mockResolvedValue({ ...expected });
        collectionRepository.findByName.mockResolvedValue({ ...collection });

        const actual = await service.activate(itemId, itemRequest);

        expect(itemRepository.activate).toHaveBeenCalledWith(expected, itemRequest, collection);
        expect(actual).toEqual(expected);
      });
    });

    describe('and the address does not exist', () => {
      it('should throw a BusinessException with expected message', async () => {
        const itemRequest = { address: '123' } as ItemRequestDto;

        accountRepository.findByAddress.mockResolvedValue(null);

        const exception = () => service.activate('123', itemRequest);

        await expect(exception).rejects.toThrow(BusinessException);
        await expect(exception).rejects.toEqual(
          new BusinessException(BusinessErrors.address_not_associated)
        );

        expect(itemRepository.findDraftById).not.toHaveBeenCalled();
        expect(itemRepository.activate).not.toHaveBeenCalled();
      });
    });

    describe('and the item does not exist', () => {
      it('should throw a NotFoundException with expected message', async () => {
        const unexistingId = '123';
        const itemRequest = { address: '123' } as ItemRequestDto;
        const account = { accountId: '456' } as Account;
        const errorMessage = `The item with id ${unexistingId} does not exist`;

        accountRepository.findByAddress.mockResolvedValue({ ...account });
        itemRepository.findActiveById.mockResolvedValue(null);

        const exception = () => service.activate(unexistingId, itemRequest);

        await expect(exception).rejects.toThrow(NotFoundException);
        await expect(exception).rejects.toEqual(new NotFoundException(errorMessage));

        expect(itemRepository.activate).not.toHaveBeenCalled();
      });
    });
  });
});
