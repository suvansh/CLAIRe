import type { NextApiRequest, NextApiResponse } from 'next';
import { deleteProfile, getProfiles } from '../../../lib/profiles';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'DELETE' || req.method === 'POST') {
    const { profile } = req.body;
    deleteProfile(profile);
    const profiles = getProfiles();
    res.status(200).json(profiles);  // Send the updated list of profiles
  } else {
    res.status(405).end();  // Method Not Allowed
  }
}
