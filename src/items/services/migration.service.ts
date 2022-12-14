import { Injectable } from '@nestjs/common';
import fs from 'fs';
import Jimp from 'jimp';
import { join } from 'path';
import { CreateCollectionDto } from 'src/collections/dto/create-collection.dto';
import jsonData from '../../jup-apes-migration/jups.json';
import { DraftItemRequestDto } from '../dto/draft-item-request.dto';
import { ItemPropertyDto } from '../dto/item-property.dto';
import { ItemProperty } from '../entities/item-property.entity';
import { ItemService } from './item.service';
import { PinataService } from './pinata.service';

const address = '0x123';
const collectionAddress = '0x456';

type MigrationDraftItem = {
  name: string;
  description: string;
  royalty: number;
  price: string;
  rewards: number;
  tokenId: number;
};

@Injectable()
export class MigrationService {
  constructor(private pinataService: PinataService, private itemService: ItemService) {}

  async process() {
    const { JUP_APES_DIRECTORY, JUP_APES_TO_UPLOAD } = process.env;

    // Get Json Object

    // Store draft

    // Store IPFS
    // Get IPFS Metadata
    // Generate vouchers
    // Activate draft items

    const fileName = '1188254.jpg';

    const { buffer, mime } = await Jimp.read(`images/${fileName}`).then(async (image) => {
      return {
        mime: image.getMIME(),
        extension: image.getExtension(),
        buffer: await image.getBufferAsync(image.getMIME()),
      };
    });

    const attributes = {
      'reserved::name': fileName,
      'reserved::description': fileName,
      'reserved::external_url': 'http://localhost:3000/item/3b432cdf-08c4-4d5e-80d8-7ce25abda336',
      rewards: '124', // from json file
      royalty: '5', // from json file
      tokenId: '1', // from json file
    };

    const pinataResponse = await this.pinataService.uploadRaw(buffer, fileName, mime, attributes);

    console.log('pinataResponse', pinataResponse);

    // const draftItem = this.storeDraftItem();

    return jsonData;

    // TODO:
    // Get bonuses file
    // Create jup ape schema
    // Loop over jup apes
    // Store on ipfs
    // Generate voucher
    // Store voucher
    // Things to take into account:
    // Retry strategy
    // Exception handling
    // Parameterize number range?
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
      address,
      collection,
      collectionAddress,
      name: draft.name,
      description: draft.description,
      price: draft.price,
      tags,
      itemProperties,
    } as DraftItemRequestDto;

    const draftItem = await this.itemService.create(request);
    console.log('draftItem', draftItem);
    return draftItem;
  }
}
