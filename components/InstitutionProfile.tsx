import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { PencilIcon } from './icons/PencilIcon';

interface InstitutionProfileProps {
    isOpen: boolean;
    onClose: () => void;
}

type ProfileFormData = {
    institution: string;
    city: string;
    state: string;
    pincode: string;
};

// A simple display component for read-only mode.
const DisplayField: React.FC<{ value: string | undefined | null }> = ({ value }) => (
    <p className="text-light text-base bg-primary p-3 rounded-lg border border-accent min-h-[48px] flex items-center">
        {value || <span className="text-text-secondary italic">Not set</span>}
    </p>
);

// A simple input component for edit mode.
const EditField: React.FC<{ value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string; required?: boolean; }> = 
    ({ value, onChange, placeholder, required }) => (
    <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full p-3 bg-primary border-2 border-accent rounded-lg focus:outline-none focus:ring-2 focus:ring-highlight transition-all text-light"
        required={required}
    />
);

export const InstitutionProfile: React.FC<InstitutionProfileProps> = ({ isOpen, onClose }) => {
    const { userProfile, completeUserProfile } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // This state holds the form data ONLY while editing. It is null when not editing.
    const [formData, setFormData] = useState<ProfileFormData | null>(null);

    // Reset local state when the modal is closed to ensure a clean state next time it opens.
    useEffect(() => {
        if (!isOpen) {
            setIsEditing(false);
            setFormData(null);
        }
    }, [isOpen]);

    if (!isOpen || !userProfile) {
        return null;
    }
    
    const handleEditClick = () => {
        // Initialize the form state with data from the current profile.
        // This creates a safe, temporary copy to modify.
        setFormData({
            institution: userProfile.institution || '',
            city: userProfile.city || '',
            state: userProfile.state || '',
            pincode: userProfile.pincode || '',
        });
        setIsEditing(true);
    };

    const handleCancel = () => {
        // To cancel, exit edit mode and clear the temporary form data.
        setIsEditing(false);
        setFormData(null);
    };

    const handleSave = async () => {
        if (!formData) return; // Should not happen if save button is visible
        setIsSaving(true);
        try {
            await completeUserProfile({
                institution: formData.institution.trim(),
                city: formData.city.trim(),
                state: formData.state.trim(),
                pincode: formData.pincode.trim(),
            });
            // After a successful save, exit edit mode and clear temporary state.
            setIsEditing(false);
            setFormData(null);
        } catch (error) {
            console.error("Failed to update profile", error);
            // In a real app, you would show an error toast here.
        } finally {
            setIsSaving(false);
        }
    };

    const handleFieldChange = (field: keyof ProfileFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
        // This function will only be called in edit mode, so formData is guaranteed to exist.
        setFormData(prev => ({ ...prev!, [field]: e.target.value }));
    };

    return (
        <div 
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fadeIn"
            onClick={onClose}
        >
            <div 
                className="bg-secondary rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-accent transform transition-transform duration-300 scale-95 animate-fadeIn"
                onClick={e => e.stopPropagation()}
                style={{animationDuration: '0.3s'}}
            >
                <div className="p-4 border-b border-accent flex justify-between items-center flex-shrink-0">
                    <h3 className="text-lg font-bold text-highlight">Profile Page</h3>
                     <div className="flex items-center space-x-2 flex-shrink-0">
                        {!isEditing && (
                            <button onClick={handleEditClick} className="flex items-center space-x-2 px-3 py-1.5 text-sm rounded-lg border-2 border-accent font-semibold text-text-secondary transition-colors hover:bg-highlight hover:text-white hover:border-highlight" title="Edit Profile">
                                <PencilIcon className="w-4 h-4" />
                                <span>Edit</span>
                            </button>
                        )}
                        <button onClick={onClose} className="text-text-secondary hover:text-white text-3xl leading-none">&times;</button>
                    </div>
                </div>
                
                <div className="p-6 overflow-y-auto space-y-6">
                    <div className="bg-primary/50 p-6 rounded-lg border border-accent text-center">
                        <img src={userProfile?.photoURL || undefined} alt="User" className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-highlight"/>
                        <h2 className="text-2xl font-bold text-light">{userProfile?.displayName}</h2>
                        <p className="text-text-secondary">{userProfile?.email}</p>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-md font-bold text-light border-b border-accent pb-2">Institution Details</h4>
                        <div>
                            <label className="text-sm font-semibold text-text-secondary mb-2 block">Institution Name</label>
                            {isEditing && formData ? (
                                <EditField value={formData.institution} onChange={handleFieldChange('institution')} required />
                            ) : (
                                <DisplayField value={userProfile.institution} />
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="text-sm font-semibold text-text-secondary mb-2 block">City</label>
                                {isEditing && formData ? (
                                    <EditField value={formData.city} onChange={handleFieldChange('city')} required />
                                ) : (
                                    <DisplayField value={userProfile.city} />
                                )}
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-text-secondary mb-2 block">State</label>
                                {isEditing && formData ? (
                                    <EditField value={formData.state} onChange={handleFieldChange('state')} placeholder="State / Province" required />
                                ) : (
                                    <DisplayField value={userProfile.state} />
                                )}
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-text-secondary mb-2 block">Pincode</label>
                                {isEditing && formData ? (
                                    <EditField value={formData.pincode} onChange={handleFieldChange('pincode')} placeholder="Pincode / ZIP" required />
                                ) : (
                                    <DisplayField value={userProfile.pincode} />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                
                 <div className="p-4 border-t border-accent text-right flex-shrink-0">
                    {isEditing ? (
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={handleCancel}
                                className="px-4 py-2 rounded-lg bg-accent text-light hover:opacity-90 transition-opacity font-semibold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-4 py-2 rounded-lg bg-success text-white hover:opacity-90 transition-opacity font-semibold disabled:opacity-50 flex items-center"
                            >
                               {isSaving && <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    ) : (
                        <button 
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg bg-highlight text-white hover:opacity-90 transition-opacity"
                        >
                            Close
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
