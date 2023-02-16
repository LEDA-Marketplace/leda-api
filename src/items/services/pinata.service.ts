import FormData from 'form-data';
import { v4 as uuidv4 } from 'uuid';
import { Injectable } from '@nestjs/common';
import { PinataRepository } from '../repositories/pinata.repository';
import { appConfig } from '../../config/app.config';
import { BusinessException } from '../../common/exceptions/exception-types';
import { isValidExtension, isValidSize } from '../../common/utils/image-utils';
import { BusinessErrors } from '../../common/constants';
import { PinataResponse } from '../../common/types/pinata-response';
import { IpfsAttribute } from 'src/common/types/ipfs-attribute';
import { IpfsTrait } from 'src/common/types/ipfs-trait';
import { ReservedAttribute } from '../enums/reserved-attribute.enum';

@Injectable()
export class PinataService {
  constructor(private pinataRepository: PinataRepository) {}
  async upload(image: Express.Multer.File, attributes: IpfsAttribute): Promise<PinataResponse> {
    const { buffer, originalname, mimetype, size } = image;
    if (!isValidExtension(image))
      throw new BusinessException(BusinessErrors.file_extension_not_supported);

    if (!isValidSize(size)) throw new BusinessException(BusinessErrors.file_size_exceeded);

    const formData = new FormData();
    const filename = originalname.replace(/\.[^/.]+$/, '');

    formData.append('file', buffer, {
      contentType: mimetype,
      filename: filename + '-' + uuidv4(),
    });

    const response = await this.pinataRepository.uploadImage(formData);
    return this.uploadMetadata(response.IpfsHash, attributes);
  }

  async uploadRaw(
    buffer: Buffer,
    originalName: string,
    mimetype: string,
    attributes: IpfsAttribute
  ): Promise<PinataResponse> {
    const formData = new FormData();
    const filename = originalName.replace(/\.[^/.]+$/, '');

    formData.append('file', buffer, {
      contentType: mimetype,
      filename: filename + '-' + uuidv4(),
    });

    const response = await this.pinataRepository.uploadImage(formData);
    return this.uploadMetadata(response.IpfsHash, attributes);
  }

  async uploadMetadata(imageHash: string, attributes: IpfsAttribute): Promise<PinataResponse> {
    const name = attributes[ReservedAttribute.name];
    if (!name) throw new BusinessException(BusinessErrors.ipfs_name_required);

    const description = attributes[ReservedAttribute.description];
    if (!description) throw new BusinessException(BusinessErrors.ipfs_description_required);

    const external_url = attributes[ReservedAttribute.external_url];
    if (!external_url) throw new BusinessException(BusinessErrors.ipfs_external_url_required);

    const atts = this.getFormattedAttributes(attributes);

    const data = JSON.stringify({
      pinataOptions: {
        cidVersion: 1,
      },
      pinataContent: {
        description,
        external_url,
        name,
        attributes: atts,
        image: `${appConfig().pinataGatewayUrl}/${imageHash}`,
      },
    });

    return this.pinataRepository.uploadMetadata(data);
  }

  getFormattedAttributes(attributes: IpfsAttribute): IpfsTrait[] {
    return Object.keys(attributes)
      .map((key) => {
        if (key.includes('reserved::')) return;

        return { trait_type: key, value: attributes[key] } as IpfsTrait;
      })
      .filter((att) => !!att);
  }
}
