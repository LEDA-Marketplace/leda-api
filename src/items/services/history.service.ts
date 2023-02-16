import { Injectable } from '@nestjs/common';
import { History } from '../entities/history.entity';
import { HistoryRepository } from '../repositories/history.repository';

@Injectable()
export class HistoryService {
  constructor(private historyRepository: HistoryRepository) {}

  async findAll(): Promise<History[]> {
    return this.historyRepository.findAll();
  }

  async findAllByItemId(itemId: string): Promise<History[]> {
    return this.historyRepository.findAllByItemId(itemId);
  }
}
