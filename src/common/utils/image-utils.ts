// TODO: Convert this functions into a middleware

const ALLOWED_FILE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'];
const ALLOWED_FILE_SIZE_IN_MB = 1000;

export const isValidExtension = (image: Express.Multer.File) => {
  return ALLOWED_FILE_TYPES.includes(image.mimetype);
};

export const isValidSize = (size: number) => {
  return size / (1024 * 1024) <= ALLOWED_FILE_SIZE_IN_MB;
};

export const formatImageUrl = (url: string) => {
  const search = 'ipfs/';
  const index = url.indexOf(search);
  return url.substring(index + search.length, url.length);
};
