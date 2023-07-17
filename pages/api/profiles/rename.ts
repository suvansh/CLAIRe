import type { NextApiRequest, NextApiResponse } from 'next';
import { renameProfile, getProfiles } from '../../../lib/profiles';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("In rename.ts", req.method)
  if (req.method === 'PUT') {
    const { oldProfile, newProfile } = req.body;
    console.log("Renaming profile: " + oldProfile + " to " + newProfile);
    renameProfile(oldProfile, newProfile);
    const profiles = getProfiles();
    res.status(200).json(profiles);  // Send the updated list of profiles
  } else {
    res.status(405).end();  // Method Not Allowed
  }
}
