import { Test, TestingModule } from '@nestjs/testing';
import { Account } from '../../account/entities/account.entity';
import { History } from '../entities/history.entity';
import { Item } from '../entities/item.entity';
import { TransactionType } from '../enums/transaction-type.enum';
import { HistoryRepository } from '../repositories/history.repository';
import { HistoryService } from '../services/history.service';

const historyRepositoryMock = () => ({
  findAll: jest.fn(),
  findAllByItemId: jest.fn(),
  createHistory: jest.fn(),
});

describe('HistoryService', () => {
  let service: HistoryService;
  let historyRepository;
  let history: History[] = [];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HistoryService,
        { provide: HistoryRepository, useFactory: historyRepositoryMock },
      ],
    }).compile();

    service = await module.get(HistoryService);
    historyRepository = await module.get(HistoryRepository);

    history = [
      {
        id: '1',
        price: '1',
        transactionType: TransactionType.Listed,
        listId: 1,
        owner: {} as Account,
        item: {} as Item,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  });

  describe('When findAll function is called', () => {
    it('should return an array of history ', async () => {
      const expected = history;

      const mockedData = expected.map((prop) => ({ ...prop }));
      historyRepository.findAll.mockResolvedValue(mockedData);

      const actual = await service.findAll();

      expect(actual).toEqual(expected);
    });
  });

  describe('When findById function is called', () => {
    describe('and the itemId exist', () => {
      it('should return the expected item', async () => {
        const expected = history[0];

        historyRepository.findAllByItemId.mockResolvedValue(expected);

        const actual = await service.findAllByItemId('123');

        expect(actual).toEqual(expected);
      });
    });
  });
});
