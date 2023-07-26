import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useRef } from 'react';
import useOutsideAlerter from './OutsideAlerter';
import type { IMessage, Profile } from '../types/types';


type SettingsModalProps = {
    profile: Profile | null;
    onClose: () => void;
    setTempApiError: (error: string) => void;
    setTempSuccessMessage: (message: string) => void;
    setMessages: (messages: IMessage[]) => void;
};

const SettingsModal: React.FC<SettingsModalProps> = ({ profile, onClose, setTempApiError, setTempSuccessMessage, setMessages }) => {
    const ref = useRef(null);
    useOutsideAlerter(ref, onClose);

    const handleClearData = async () => {
        if (!profile) {
            return;
        }
        if (window.confirm(`Are you sure you want to erase all data for user ${profile.name}?`)) {
            const res = await fetch('/api/delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ profile })
            });

            if (res.ok) {
                onClose();
                setMessages([]);
                const { message } = await res.json();
                setTempSuccessMessage(message);
            } else {
                const { errorMessage } = await res.json();
                setTempApiError(`An error occurred while deleting data: ${errorMessage}`);
            }
        }
    };

    return (
        <div className="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                <div ref={ref} className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full p-4">
                    <div className="flex justify-between items-start">
                        <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                            Settings
                        </h3>
                        <button onClick={onClose} className="ml-2 mb-1 h-6 w-6">
                            <FontAwesomeIcon icon={faTimes} />
                        </button>
                    </div>
                    <button onClick={handleClearData} className="ml-2 bg-red-500 text-white px-3 py-1 rounded-md">Clear Data</button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;