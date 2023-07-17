import path from 'path';

export function getClaireDirectory(): string {
  const rootDirectory = process.cwd();
  const claireDirectory = path.join(rootDirectory, '.claire');
  return claireDirectory;
}