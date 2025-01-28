export const asyncForEach = async (array: any[], callback: any) => {
  if (!Array.isArray(array)) {
    throw new Error('Expected an array');
  }
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
};

export const slugGenerator = (metaData: string): string => {
  const formattedMetaData = metaData
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const currentDate = new Date();
  const dateTimeString = currentDate.toISOString().replace(/[:.]/g, '-');

  return `${formattedMetaData}-${dateTimeString}`;
};