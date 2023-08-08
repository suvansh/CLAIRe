import type { NextApiRequest, NextApiResponse } from 'next';
import { renameProfile, getProfiles } from '../../../lib/profiles';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(404).end();  // Not Found
}
