import { Injectable } from '@nestjs/common';
import { BusinessErrors } from 'src/common/constants';
import { BusinessException } from 'src/common/exceptions/exception-types';
import { VoucherRepository } from '../repositories/voucher.repository';

@Injectable()
export class VoucherService {
  constructor(private voucherRepository: VoucherRepository) {}

  async deleteVoucher(voucherId: string): Promise<void> {
    const voucher = await this.voucherRepository.findOneBy({ voucherId });
    if (!voucher) throw new BusinessException(BusinessErrors.voucher_not_found);

    await this.voucherRepository.delete(voucherId);
  }
}
