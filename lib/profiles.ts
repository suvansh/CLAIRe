import fs from 'fs';
import path from 'path';
import { DEFAULT_PROFILE } from './consts';
import { getClaireDirectory } from '@/utils/utils';


const profilePath = path.join(getClaireDirectory(), 'profiles.json');

export function getProfiles(): string[] {
  if (!fs.existsSync(profilePath)) {
    return [DEFAULT_PROFILE];  // Default profile if no profile file exists
  }

  const fileContent = fs.readFileSync(profilePath, 'utf-8');
  return JSON.parse(fileContent);
}

export function addProfile(profile: string): void {
  const profiles = getProfiles();
  if (!profiles.includes(profile)) {
    profiles.push(profile);
    fs.writeFileSync(profilePath, JSON.stringify(profiles, null, 2), 'utf-8');
  }
}

export function deleteProfile(profile: string): void {
  let profiles = getProfiles();
  profiles = profiles.filter(p => p !== profile);
  if (profiles.length === 0) {
    profiles = [DEFAULT_PROFILE];  // Ensure there's always one profile
  }
  fs.writeFileSync(profilePath, JSON.stringify(profiles, null, 2), 'utf-8');
}

export function renameProfile(oldProfile: string, newProfile: string): void {
  let profiles = getProfiles();
  const index = profiles.indexOf(oldProfile);
  if (index !== -1) {
    profiles[index] = newProfile;
    fs.writeFileSync(profilePath, JSON.stringify(profiles, null, 2), 'utf-8');
  }
}
