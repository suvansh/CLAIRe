import { useState, ChangeEvent, FormEvent, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import useOutsideAlerter from './OutsideAlerter';
import { Profile } from '../types/types';

interface ProfileSwitcherProps {
    profiles: Profile[];
    onClose: () => void;
    onSelectProfile: (profile: Profile) => void;
    onProfileChange: (newProfiles: Profile[], newProfile: Profile | null, clear: boolean) => void;
}

const ProfileSwitcher: React.FC<ProfileSwitcherProps> = ({ profiles, onClose, onSelectProfile, onProfileChange }) => {
    const ref = useRef(null);
    useOutsideAlerter(ref, onClose);

    const [newProfileName, setNewProfileName] = useState<string>("");

    const handleAddProfile = async (event: FormEvent) => {
        event.preventDefault();
        if (!newProfileName) {
            return;
        }
        const response = await fetch('/api/profiles/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ profileName: newProfileName })
        });
        if (response.ok) {
            const {newProfile, profiles} = await response.json();
            onProfileChange(profiles, newProfile, true);
            setNewProfileName('');
        }
    };

    const handleDeleteProfile = async (profileToDelete: Profile) => {
        const confirmDelete = window.confirm(`Are you sure you want to delete the profile ${profileToDelete.name}?`);
        if (confirmDelete) {
            const response = await fetch('/api/profiles/delete', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ profile: profileToDelete })
            });
            if (response.ok) {
              const profiles = await response.json();
              onProfileChange(profiles, null, true);
            }
        }
    };

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
        setNewProfileName(event.target.value);
    };

    return (
        <div className="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                <div ref={ref} className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full p-4">
                    <div className="flex justify-between items-start">
                        <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                            Profile Selection
                        </h3>
                        <button onClick={onClose} className="ml-2 mb-1 h-6 w-6">
                            <FontAwesomeIcon icon={faTimes} />
                        </button>
                    </div>
                    {profiles.map((profile) => (
                        <div key={profile.uuid} className="flex justify-between items-center mt-4">
                            <button key={profile.uuid} onClick={() => onSelectProfile(profile)} className="ml-2 bg-blue-500 text-white px-3 py-1 rounded-md mt-2">{profile.name}</button>
                        </div>
                    ))}
                    <form onSubmit={handleAddProfile} className="mt-4">
                        <input
                            type="text"
                            value={newProfileName}
                            onChange={handleChange}
                            placeholder="New profile name"
                            className="border rounded-md p-2 w-full"
                        />
                        <button type="submit" className="ml-2 bg-green-500 text-white px-3 py-1 rounded-md mt-2">Add Profile</button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ProfileSwitcher;
