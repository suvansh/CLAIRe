import { useState, ChangeEvent, FormEvent, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import useOutsideAlerter from './OutsideAlerter';

interface ProfileSwitcherProps {
    profiles: string[];
    onClose: () => void;
    onSelectProfile: (profile: string) => void;
    onProfileChange: (newProfiles: string[], newProfile: string | null, clear: boolean) => void;
}

const ProfileSwitcher: React.FC<ProfileSwitcherProps> = ({ profiles, onClose, onSelectProfile, onProfileChange }) => {
    const ref = useRef(null);
    useOutsideAlerter(ref, onClose);

    const [newProfile, setNewProfile] = useState('');
    const [editingProfile, setEditingProfile] = useState<string | null>(null);
    const [newProfileName, setNewProfileName] = useState<string>("");
    const inputRef = useRef<HTMLInputElement>(null);

    const handleAddProfile = async (event: FormEvent) => {
        event.preventDefault();
        const response = await fetch('/api/profiles/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ profile: newProfile })
        });
        if (response.ok) {
            const newProfiles = await response.json();
            onProfileChange(newProfiles, newProfile, true);
            setNewProfile('');
        }
    };

    const handleDeleteProfile = async (profileToDelete: string) => {
        const confirmDelete = window.confirm(`Are you sure you want to delete the profile ${profileToDelete}?`);
        if (confirmDelete) {
            console.log("confirmed delete");
            try {
                const response = await fetch('/api/profiles/delete', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ profile: profileToDelete })
                });
                if (response.ok) {
                  console.log("response ok");
                  const newProfiles = await response.json();
                  onProfileChange(newProfiles, null, true);
                }
              } catch (error) {
                console.log("error deleting profile", error);
                console.error('Error deleting profile:', error);
              }
              
        }
    };

    const handleRenameProfile = async (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && editingProfile !== null) {
            const response = await fetch('/api/profiles/rename', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ oldProfile: editingProfile, newProfile: newProfileName })
            });
            if (response.ok) {
                const newProfiles = await response.json();
                onProfileChange(newProfiles, newProfileName, false);
                setEditingProfile(null);
            }
        }
    };

    const handleCancel = () => {
        setEditingProfile(null);
    };

    const handleEdit = (profile: string) => {
        setEditingProfile(profile);
        setNewProfileName(profile);
    };

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
        setNewProfile(event.target.value);
    };

    useEffect(() => {
        if (editingProfile && inputRef.current) {
            inputRef.current.focus();
        }
    }, [editingProfile]);

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
                        <div key={profile} className="flex justify-between items-center mt-4">
                            {editingProfile === profile ? (
                                <input
                                    type="text"
                                    ref={inputRef}
                                    value={newProfileName}
                                    onChange={e => setNewProfileName(e.target.value)}
                                    onKeyDown={handleRenameProfile}
                                />
                            ) : (
                                <button key={profile} onClick={() => onSelectProfile(profile)} className="ml-2 bg-blue-500 text-white px-3 py-1 rounded-md mt-2">{profile}</button>
                            )}
                            <div>
                                {editingProfile === profile ? (
                                    <button onClick={handleCancel} className="bg-yellow-500 text-white px-3 py-1 rounded-md">Cancel</button>
                                ) : (
                                    <>
                                        <button onClick={() => handleEdit(profile)} className="ml-2 bg-yellow-500 text-white px-3 py-1 rounded-md">Edit</button>
                                        <button onClick={() => handleDeleteProfile(profile)} className="ml-2 bg-red-500 text-white px-3 py-1 rounded-md">Delete</button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                    <form onSubmit={handleAddProfile} className="mt-4">
                        <input
                            type="text"
                            value={newProfile}
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
