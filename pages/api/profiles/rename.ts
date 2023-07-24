import type { NextApiRequest, NextApiResponse } from 'next';
import { renameProfile, getProfiles } from '../../../lib/profiles';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'PUT') {
    const { oldProfile, editedProfileName } = req.body;
    const newProfile = renameProfile(oldProfile.uuid, editedProfileName);
    const profiles = getProfiles();
    res.status(200).json({ profiles, newProfile });  // Send the updated list of profiles
  } else {
    res.status(405).end();  // Method Not Allowed
  }
}
