import { Item } from 'src/config/entities.config';

export const getAverage = (items: Item[]) => {
  const itemsTotalLikes = items.reduce((prev, actual) => prev + actual.likes, 0);
  return itemsTotalLikes / items.length;
};
