import type { NextApiRequest, NextApiResponse } from 'next';
import { addProfile, getProfiles } from '../../../lib/profiles';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { profile } = req.body;
    addProfile(profile);
    const profiles = getProfiles();
    res.status(201).json(profiles);  // Send the updated list of profiles
  } else {
    res.status(405).end();  // Method Not Allowed
  }
}
