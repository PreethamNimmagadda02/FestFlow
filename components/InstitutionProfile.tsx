import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { PencilIcon } from './icons/PencilIcon';
import { LogOutIcon } from './icons/LogOutIcon';

interface InstitutionProfileProps {
    isOpen: boolean;
    onClose: () => void;
}

// A simple display component for read-only mode.
const DisplayField: React.FC<{ value: string | undefined | null }> = ({ value }) => (
    <p className="text-light text-base bg-primary p-3 rounded-lg border border-accent min-h-[48px] flex items-center">
        {value || <span className="text-text-secondary italic">Not set</span>}
    </p>
);

export const InstitutionProfile: React.FC<InstitutionProfileProps> = ({ isOpen, onClose }) => {
    const { userProfile, updateUserDisplayNameAndPhoto, uploadProfilePicture, logout } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editData, setEditData] = useState({ displayName: '', photoURL: '' });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setIsEditing(false);
            setSelectedFile(null);
            setPreviewUrl(null);
            setUploadError(null);
        }
    }, [isOpen]);

    if (!isOpen || !userProfile) {
        return null;
    }
    
    const handleEditClick = () => {
        setEditData({
            displayName: userProfile.displayName || '',
            photoURL: userProfile.photoURL || '',
        });
        setSelectedFile(null);
        setPreviewUrl(null);
        setUploadError(null);
        setIsEditing(true);
    };

    const handleCancel = () => {
        setIsEditing(false);
        setSelectedFile(null);
        setPreviewUrl(null);
        setUploadError(null);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        setUploadError(null);

        if (!file) {
            setSelectedFile(null);
            setPreviewUrl(null);
            return;
        }

        // Validate file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            setUploadError('Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.');
            setSelectedFile(null);
            setPreviewUrl(null);
            return;
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB in bytes
        if (file.size > maxSize) {
            setUploadError('File size too large. Please upload an image smaller than 5MB.');
            setSelectedFile(null);
            setPreviewUrl(null);
            return;
        }

        setSelectedFile(file);

        // Create preview URL
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        setIsSaving(true);
        setUploadError(null);
        try {
            let photoURL = editData.photoURL.trim();

            // If a file was selected, upload it first
            if (selectedFile) {
                setIsUploading(true);
                try {
                    photoURL = await uploadProfilePicture(selectedFile);
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Failed to upload image';
                    setUploadError(errorMessage);
                    setIsSaving(false);
                    setIsUploading(false);
                    return;
                } finally {
                    setIsUploading(false);
                }
            }

            await updateUserDisplayNameAndPhoto({
                displayName: editData.displayName.trim(),
                photoURL: photoURL,
            });
            
            setIsEditing(false);
            setSelectedFile(null);
            setPreviewUrl(null);
        } catch (error) {
            console.error("Failed to update profile", error);
            setUploadError('Failed to update profile. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        onClose();
    };

    const handleFieldChange = (field: keyof typeof editData) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditData(prev => ({ ...prev, [field]: e.target.value }));
    };

    const getFallbackAvatar = () => {
        const initials = userProfile?.displayName?.split(' ').map(n => n[0]).join('').substring(0, 2) || '??';
        return `https://avatar.vercel.sh/${userProfile.uid}.svg?text=${initials}`;
    }

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
                        <img 
                            src={previewUrl || (isEditing ? editData.photoURL : userProfile?.photoURL) || getFallbackAvatar()} 
                            alt="User" 
                            className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-highlight object-cover bg-secondary"
                            onError={(e) => { e.currentTarget.src = getFallbackAvatar() }}
                        />
                         {isEditing ? (
                            <div className="space-y-4 mt-4 max-w-md mx-auto">
                                <div>
                                    <label htmlFor="displayName" className="text-sm font-semibold text-text-secondary mb-2 block">Display Name</label>
                                    <input
                                        id="displayName"
                                        type="text"
                                        value={editData.displayName}
                                        onChange={handleFieldChange('displayName')}
                                        className="w-full text-center p-2 bg-primary border-2 border-accent rounded-lg focus:outline-none focus:ring-2 focus:ring-highlight transition-all text-light text-xl font-bold"
                                    />
                                </div>
                                <div>
                                     <label htmlFor="profilePicture" className="text-sm font-semibold text-text-secondary mb-2 block">Profile Picture</label>
                                     <div className="flex flex-col items-center space-y-2">
                                        <input
                                            id="profilePicture"
                                            type="file"
                                            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                                            onChange={handleFileChange}
                                            className="hidden"
                                        />
                                        <label 
                                            htmlFor="profilePicture"
                                            className="cursor-pointer w-full p-3 bg-primary border-2 border-accent rounded-lg hover:border-highlight transition-all text-light text-center flex items-center justify-center space-x-2"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                            </svg>
                                            <span>{selectedFile ? selectedFile.name : 'Choose an image'}</span>
                                        </label>
                                        {selectedFile && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedFile(null);
                                                    setPreviewUrl(null);
                                                    setUploadError(null);
                                                }}
                                                className="text-sm text-red-400 hover:text-red-300 transition-colors"
                                            >
                                                Remove selected image
                                            </button>
                                        )}
                                        <p className="text-xs text-text-secondary">Supported: JPEG, PNG, GIF, WebP (Max 5MB)</p>
                                        {uploadError && <p className="text-danger text-sm">{uploadError}</p>}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <h2 className="text-2xl font-bold text-light">{userProfile?.displayName}</h2>
                                <p className="text-text-secondary">{userProfile?.email}</p>
                            </>
                        )}
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-md font-bold text-light border-b border-accent pb-2">Institution Details</h4>
                        <div>
                            <label className="text-sm font-semibold text-text-secondary mb-2 block">Institution Name</label>
                            <DisplayField value={userProfile.institution} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="text-sm font-semibold text-text-secondary mb-2 block">City</label>
                                <DisplayField value={userProfile.city} />
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-text-secondary mb-2 block">State</label>
                                <DisplayField value={userProfile.state} />
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-text-secondary mb-2 block">Pincode</label>
                                <DisplayField value={userProfile.pincode} />
                            </div>
                        </div>
                    </div>
                </div>
                
                 <div className="p-4 border-t border-accent flex justify-between items-center flex-shrink-0">
                    <button 
                        onClick={handleLogout}
                        className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-danger/20 text-red-400 hover:bg-danger hover:text-white transition-colors font-semibold"
                    >
                        <LogOutIcon className="w-4 h-4" />
                        <span>Logout</span>
                    </button>
                    <div className="flex items-center space-x-3">
                        {isEditing ? (
                            <>
                                <button
                                    onClick={handleCancel}
                                    className="px-4 py-2 rounded-lg bg-accent text-light hover:opacity-90 transition-opacity font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving || isUploading}
                                    className="px-4 py-2 rounded-lg bg-success text-white hover:opacity-90 transition-opacity font-semibold disabled:opacity-50 flex items-center"
                                >
                                {(isSaving || isUploading) && <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                                    {isUploading ? 'Uploading...' : isSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </>
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
        </div>
    );
};
