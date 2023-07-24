import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid'; // Add this import
import { DEFAULT_PROFILE } from './consts';
import { getClaireDirectory } from '../utils/utils';
import { Profile } from '../types/types';


const profilePath = path.join(getClaireDirectory(), 'profiles.json');


export function getProfiles(): Profile[] {
  if (!fs.existsSync(profilePath)) {
    // If no profile file exists, create one with a default profile
    const defaultProfile: Profile = {
      name: DEFAULT_PROFILE,
      uuid: uuidv4(),
    };
    fs.writeFileSync(profilePath, JSON.stringify([defaultProfile], null, 2), 'utf-8');
    return [defaultProfile];
  }

  const fileContent = fs.readFileSync(profilePath, 'utf-8');
  return JSON.parse(fileContent);
}

export function addProfile(profileName: string): Profile {
  const profiles = getProfiles();
  const newProfile: Profile = {
    name: profileName,
    uuid: uuidv4(),
  };
  profiles.push(newProfile);
  fs.writeFileSync(profilePath, JSON.stringify(profiles, null, 2), 'utf-8');
  return newProfile;
}

export function deleteProfile(profileUUID: string): void {
  let profiles = getProfiles();
  profiles = profiles.filter(p => p.uuid !== profileUUID);
  if (profiles.length === 0) {
    // If all profiles are deleted, create a new default profile
    const defaultProfile: Profile = {
      name: DEFAULT_PROFILE,
      uuid: uuidv4(),
    };
    profiles = [defaultProfile];
  }
  fs.writeFileSync(profilePath, JSON.stringify(profiles, null, 2), 'utf-8');
}

export function renameProfile(profileUUID: string, newProfileName: string): Profile | null {
  let profiles = getProfiles();
  const index = profiles.findIndex(p => p.uuid === profileUUID);
  if (index !== -1) {
    profiles[index].name = newProfileName;
    fs.writeFileSync(profilePath, JSON.stringify(profiles, null, 2), 'utf-8');
    return profiles[index];
  }
  return null;
}