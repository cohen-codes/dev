import { readdirSync, promises as fsPromises } from 'fs';
import { join } from 'path';

export function scanDirectory(dir: string) {
  const files = readdirSync(dir, { withFileTypes: true });
  const result: string[] = [];
  for (const file of files) {
    if (file.isDirectory()) {
      result.push(...scanDirectory(join(dir, file.name)));
    } else {
      result.push(join(dir, file.name));
    }
  }
  return result;
}

export async function scanDirectoryAsync(dir: string) {
  const files = await fsPromises.readdir(dir, { withFileTypes: true });
  const result: string[] = [];
  for (const file of files) {
    if (file.isDirectory()) {
      result.push(...(await scanDirectoryAsync(join(dir, file.name))));
    } else {
      result.push(join(dir, file.name));
    }
  }
  return result;
}
