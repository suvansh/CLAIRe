import type { NextApiRequest, NextApiResponse } from 'next';
import { getProfiles } from '../../../lib/profiles';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const profiles = getProfiles();
    res.status(200).json(profiles);
  } else {
    res.status(405).end();  // Method Not Allowed
  }
}
