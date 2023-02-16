import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { writeFileSync } from 'fs';
import Jimp from 'jimp';
import { join } from 'path';
import { firstValueFrom } from 'rxjs';
import { appConfig } from '../../config/app.config';
import { CreateCollectionDto } from '../../collections/dto/create-collection.dto';
import {
  Domain,
  IpfsObjectResponse,
  LogType,
  MigrationDraftItem,
  MigrationItem,
  types,
  Voucher,
} from '../../common/types/migration-types';
import { DraftItemRequestDto } from '../dto/draft-item-request.dto';
import { ItemPropertyDto } from '../dto/item-property.dto';
import { LazyItemRequestDto } from '../dto/lazy-item-request.dto';
import { Item } from '../entities/item.entity';
import { ItemService } from './item.service';
import { PinataService } from './pinata.service';
import { ethers } from 'ethers';
import { Account } from 'src/account/entities/account.entity';
import { LazyProcessType } from '../enums/lazy-process-type.enum';
import { VoucherRepository } from '../repositories/voucher.repository';
import { ItemRepository } from '../repositories/item.repository';
import { Collection } from 'src/collections/entities/collection.entity';
import { formatImageUrl } from 'src/common/utils/image-utils';
import { MigrationRequestDto } from '../dto/migration-request.dto';
import { BusinessException } from 'src/common/exceptions/exception-types';
import { items } from 'src/jup-apes-migration/jup';

@Injectable()
export class MigrationService {
  ADDRESS = process.env.MIGRATION_ADDRESS;
  ACCOUNT_ID = process.env.MIGRATION_ACCOUNT_ID;
  JUP_APE_COLLECTION_ID = process.env.MIGRATION_JUP_APE_COLLECTION_ID;
  COLLECTION_ADDRESS = process.env.MIGRATION_COLLECTION_ADDRESS;
  PRIVATE_KEY = process.env.MIGRATION_PRIVATE_KEY;
  CHAIN_ID = +process.env.MIGRATION_CHAIN_ID;
  SIGNING_DOMAIN_NAME = 'LazyNFT-Voucher';
  SIGNING_DOMAIN_VERSION = '1';
  ROYALTIES = 5; // TODO: shouldn't be fixed

  constructor(
    private pinataService: PinataService,
    private itemService: ItemService,
    private httpService: HttpService,
    private voucherRepository: VoucherRepository,
    private itemRepository: ItemRepository
  ) {}

  async saveLogs(log: LogType, type: 'success' | 'failed') {
    const { name, status, errorInfo, cid, itemId } = log;
    // const logsRoute = `${join(process.cwd())}/migration-logs.txt`;
    const successLogsRoute = `${join(process.cwd())}/migration-logs/success-logs.txt`;
    const failedLogsRoute = `${join(process.cwd())}/migration-logs/failed-logs.txt`;
    const logsRoute = type === 'success' ? successLogsRoute : failedLogsRoute;

    const template = `
/*************** ITEM: ${name} - (${status ? 'Success' : 'Failed'}) **************/
Item: itemId: ${itemId}
IPFS: cid: ${cid}
Success: ${status}
Date: ${new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })} (San Diego)
Exception: ${errorInfo}
/***********************************************************/
`;

    writeFileSync(logsRoute, template, {
      encoding: 'utf-8',
      flag: 'a',
    });
  }

  async init({ from, to }: MigrationRequestDto) {
    console.log('entered to init');
    if (to < from) {
      throw new BusinessException({
        name: 'Migration Exception',
        message: 'Please enter a valid interval.',
        code: 500,
      });
    }
    if (to - from > 100) {
      throw new BusinessException({
        name: 'Migration Exception',
        message: 'Please enter an interval with less than 100 items inside',
        code: 500,
      });
    }
    const responses = [];

    const itemsToMap = items.filter((item) => item.name >= from && item.name <= to);
    console.log('got items to map', itemsToMap);
    if (!itemsToMap.length) {
      throw new BusinessException({
        name: 'Migration Exception',
        message: 'Not found items with those names',
        code: 404,
      });
    }

    for (const item of itemsToMap) {
      const responsePromise = this.process(item);
      responses.push(responsePromise);
      console.log(`JupApe #${item.name} is being processed...`);
    }

    const start = performance.now();
    const proccesedPromises = await Promise.allSettled(responses);

    proccesedPromises.map((prom) => {
      const { status } = prom;

      if (status === 'fulfilled') {
        const { value: item } = prom;

        const log = {
          itemId: item.itemId,
          cid: item.image.cid,
          errorInfo: 'none',
          name: item.name,
          status: true,
        } as LogType;
        this.saveLogs(log, 'success');
      } else {
        const { reason } = prom;
        const jsonReason = JSON.parse(reason.message);
        const log = {
          name: `JUP Ape N°${jsonReason.name}`,
          itemId: jsonReason.itemId,
          cid: 'none',
          errorInfo: jsonReason.error,
          status: false,
        } as LogType;
        this.saveLogs(log, 'failed');
      }
    });
    const end = performance.now();
    console.log(`Execution time: ${end - start} ms`);
    return 'The execution has finished successfully';
  }

  async process(item: MigrationItem) {
    let draft: Item;
    try {
      const { name, rewards, price, description } = item;
      const itemName = `JUP Ape N°${name}`;

      // Store draft item
      draft = await this.storeDraftItem({
        name: itemName,
        description,
        royalty: 5,
        price,
        rewards,
        tokenId: name,
      });
      console.log({ draft });

      // Store IPFS
      const { IpfsHash: cid } = await this.storeIpfsObject(item, draft.itemId);
      const url = await this.getIpfsMetadata(item.name, cid);

      // Generate voucher
      const wei = ethers.utils.parseUnits(String(price), 'ether').toString();
      const voucher = await this.createVoucher(cid, wei, rewards, name, this.ROYALTIES * 10);

      // Activate Draft item and store voucher
      const activated = await this.activateItem(draft, {
        minPrice: voucher.minPrice.toString(),
        price,
        royalties: voucher.royalties,
        signature: voucher.signature,
        image: { url, cid: cid },
        lazyProcessType: LazyProcessType.Activation,
        tokenId: name,
        stakingRewards: rewards,
      } as LazyItemRequestDto);
      console.log({ activated });
      return activated;
    } catch (error) {
      console.log('ex | process migration', error);
      const errorBody = {
        name: item.name,
        error: `${error.message}. - ${error.stack}`,
        itemId: draft.itemId,
      };
      throw new Error(JSON.stringify(errorBody));
    }
  }

  async storeDraftItem(draft: MigrationDraftItem) {
    const collection = { name: 'JupApeNFT' } as CreateCollectionDto;
    const tags = ['JUP APE'];

    const itemProperties = [
      { key: 'rewards', value: draft.rewards },
      { key: 'royalty', value: draft.royalty },
      { key: 'tokenId', value: draft.tokenId.toString() },
    ] as ItemPropertyDto[];

    const request = {
      address: this.ADDRESS,
      collection,
      collectionAddress: this.COLLECTION_ADDRESS,
      name: draft.name,
      description: draft.description,
      price: draft.price,
      royalty: draft.royalty,
      tags,
      itemProperties,
      tokenId: draft.tokenId,
      stakingRewards: draft.rewards,
    } as DraftItemRequestDto;

    const draftItem = await this.itemService.create(request);

    return draftItem;
  }

  async storeIpfsObject(migrationItem: MigrationItem, itemId: string) {
    const { name, rewards } = migrationItem;
    const itemName = `JUP Ape N°${name}`;

    const { buffer, mime, extension } = await Jimp.read(`images/${name}.jpg`).then(
      async (image) => {
        return {
          mime: image.getMIME(),
          extension: image.getExtension(),
          buffer: await image.getBufferAsync(image.getMIME()),
        };
      }
    );

    const attributes = {
      'reserved::name': itemName,
      'reserved::description': itemName,
      'reserved::external_url': `http://localhost:3000/item/${itemId}`, // TODO: Pull prod environment here
      rewards,
      royalty: '5', // This value is fixed
      tokenId: name,
    };

    const pinataResponse = await this.pinataService.uploadRaw(
      buffer,
      `${name}.${extension}`,
      mime,
      attributes
    );
    return pinataResponse;
  }

  async getIpfsMetadata(name: number, cid: string) {
    const { pinataGatewayUrl } = appConfig();

    const { data } = await firstValueFrom(
      this.httpService.get<IpfsObjectResponse>(`${pinataGatewayUrl}/${cid}`)
    );
    return data.image;
  }

  async activateItem(item: Item, lazyItemRequest: LazyItemRequestDto) {
    await this.voucherRepository.createVoucher(item, lazyItemRequest, {
      accountId: this.ACCOUNT_ID,
      address: this.ADDRESS,
    } as Account);
    return this.itemRepository.activateLazyItem(item, lazyItemRequest, {
      id: this.JUP_APE_COLLECTION_ID,
    } as Collection);
  }

  async createVoucher(
    uri: string,
    minPrice: string,
    stakingRewards: number,
    tokenId: number,
    royalties: number
  ): Promise<Voucher> {
    try {
      const signer = new ethers.Wallet(this.PRIVATE_KEY);
      const domain = await this.signingDomain();
      const voucher = { tokenId, minPrice, uri, royalties, stakingRewards };
      const signature = await signer._signTypedData(domain, types, voucher);

      return { ...voucher, signature } as Voucher;
    } catch (err) {
      console.log('createVoucher|exception', err);
    }
  }

  private async signingDomain(): Promise<Domain> {
    return {
      name: this.SIGNING_DOMAIN_NAME,
      version: this.SIGNING_DOMAIN_VERSION,
      verifyingContract: this.COLLECTION_ADDRESS,
      chainId: +this.CHAIN_ID,
    };
  }
}
