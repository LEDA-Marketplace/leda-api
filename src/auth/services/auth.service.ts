import { AccountRepository } from '../../account/repositories/account.repository';
import { BusinessErrors } from '../../common/constants';
import { BusinessException, UnauthorizedException } from '../../common/exceptions/exception-types';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { createHmac } from 'crypto';
import { CredentialsRequestDto } from '../dto/credentials-request.dto';
import { CredentialsResponseDto } from '../dto/credentials-response.dto';
import { JwtService } from '@nestjs/jwt';
import { recoverPersonalSignature } from '@metamask/eth-sig-util';
import { SigninRequestDto } from '../dto/signin-request.dto';
import { v4 as uuidv4 } from 'uuid';
import { appConfig } from '../../config/app.config';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private accountRepository: AccountRepository,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {}

  async signin({ nonce, signature }: SigninRequestDto): Promise<CredentialsResponseDto> {
    if (!nonce) throw new BusinessException(BusinessErrors.nonce_required);
    if (!signature) throw new BusinessException(BusinessErrors.signature_required);

    const address = recoverPersonalSignature({ data: nonce, signature });
    const cachedNonce = await this.cacheManager.get<string>(address);

    if (nonce === cachedNonce) {
      let account = await this.accountRepository.findByAddress(address);

      if (!account) {
        account = this.accountRepository.create({
          address: address.toLocaleLowerCase(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        await this.accountRepository.save(account);
      }

      const access_token = this.jwtService.sign({
        address: account.address,
      });

      this.cacheManager.del(address);

      return { access_token };
    }

    throw new UnauthorizedException();
  }

  async getNonce({ address }: CredentialsRequestDto): Promise<string> {
    if (!address) throw new BusinessException(BusinessErrors.address_required);

    const { nonceTimeExpirationInMiliseconds } = appConfig();
    const nonce = createHmac('sha256', uuidv4()).digest('hex');

    await this.cacheManager.set(address, nonce, nonceTimeExpirationInMiliseconds);

    return nonce;
  }
}
