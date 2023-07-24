import type { NextApiRequest, NextApiResponse } from 'next';
import { addProfile, getProfiles } from '../../../lib/profiles';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { profileName } = req.body;
    const newProfile = addProfile(profileName);
    const profiles = getProfiles();
    res.status(201).json({ newProfile, profiles });  // Send the updated list of profiles
  } else {
    res.status(405).end();  // Method Not Allowed
  }
}
