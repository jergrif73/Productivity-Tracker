import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';

const JobFamilyEditor = ({ db, appId, currentTheme, onClose }) => {
    const [jobFamilies, setJobFamilies] = useState([]);
    const [editingJob, setEditingJob] = useState(null);
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        const jobFamilyRef = collection(db, `artifacts/${appId}/public/data/jobFamilyData`);
        const unsubscribe = onSnapshot(jobFamilyRef, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setJobFamilies(data.sort((a, b) => a.title.localeCompare(b.title)));
        });
        return () => unsubscribe();
    }, [db, appId]);

    const handleSave = async (jobData) => {
        const { id, ...data } = jobData;
        if (id) {
            const docRef = doc(db, `artifacts/${appId}/public/data/jobFamilyData`, id);
            await updateDoc(docRef, data);
        } else {
            const jobFamilyRef = collection(db, `artifacts/${appId}/public/data/jobFamilyData`);
            await addDoc(jobFamilyRef, data);
        }
        setEditingJob(null);
        setIsCreating(false);
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this position? This action cannot be undone.")) {
            const docRef = doc(db, `artifacts/${appId}/public/data/jobFamilyData`, id);
            await deleteDoc(docRef);
        }
    };
    
    const initializeJobData = (job = {}) => ({
        title: job.title || '',
        primaryResponsibilities: Array.isArray(job.primaryResponsibilities) ? job.primaryResponsibilities : [''],
        knowledgeAndSkills: Array.isArray(job.knowledgeAndSkills) ? job.knowledgeAndSkills : [''],
        independenceAndDecisionMaking: Array.isArray(job.independenceAndDecisionMaking) ? job.independenceAndDecisionMaking : [''],
        leadership: Array.isArray(job.leadership) ? job.leadership : [''],
        education: Array.isArray(job.education) ? job.education : [''],
        yearsOfExperiencePreferred: Array.isArray(job.yearsOfExperiencePreferred) ? job.yearsOfExperiencePreferred : [''],
        // Removed 'experience' from here as it's being removed from the UI
        ...job // Spread existing properties to retain 'id' and any other fields
    });

    const handleAddNew = () => {
        setEditingJob(initializeJobData()); // Initialize with empty defaults
        setIsCreating(true);
    };

    const handleEditExisting = (job) => {
        setEditingJob(initializeJobData(job)); // Initialize with existing data, ensuring arrays
        setIsCreating(false);
    };

    const handleCancelEdit = () => {
        setEditingJob(null);
        setIsCreating(false);
    };

    const handleFieldChange = (field, value) => {
        setEditingJob(prev => ({ ...prev, [field]: value }));
    };

    const handleListChange = (field, index, value) => {
        const newList = [...(editingJob[field] || [])];
        newList[index] = value;
        setEditingJob(prev => ({ ...prev, [field]: newList }));
    };

    const handleAddListItem = (field) => {
        setEditingJob(prev => ({ ...prev, [field]: [...(prev[field] || []), ''] }));
    };
    
    const handleRemoveListItem = (field, index) => {
        const newList = [...(editingJob[field] || [])];
        newList.splice(index, 1);
        setEditingJob(prev => ({ ...prev, [field]: newList }));
    };

    // Removed the useEffect that initialized properties, as it's now handled by initializeJobData


    const renderListSection = (title, fieldName) => (
        <div>
            <label className="block text-sm font-medium mb-1">{title}</label>
            {(editingJob[fieldName] || []).map((item, index) => (
                <div key={index} className="flex items-center gap-2 mb-1">
                    <input type="text" value={item} onChange={(e) => handleListChange(fieldName, index, e.target.value)} className={`flex-grow p-1 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
                    <button onClick={() => handleRemoveListItem(fieldName, index)} className="text-red-500 font-bold text-xl">&times;</button>
                </div>
            ))}
            <button onClick={() => handleAddListItem(fieldName)} className="text-blue-400 text-sm mt-1 hover:underline">+ Add Item</button>
        </div>
    );

    const renderEditForm = () => {
        // Defensive check: ensure editingJob is not null before rendering
        if (!editingJob) return null; 

        return (
            <div className="p-4 bg-gray-900/50 rounded-lg mt-4 space-y-4 border border-gray-600">
                <h3 className="text-lg font-bold text-cyan-300">{isCreating ? "Create New Position" : `Editing: ${editingJob.title}`}</h3>
                <div>
                    <label className="block text-sm font-medium mb-1">Position Title</label>
                    <input 
                        type="text"
                        value={editingJob.title}
                        onChange={(e) => handleFieldChange('title', e.target.value)}
                        className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                    />
                </div>
                
                {renderListSection('Primary Responsibilities', 'primaryResponsibilities')}
                {renderListSection('Knowledge and Skills', 'knowledgeAndSkills')}
                {renderListSection('Independence and Decision-Making', 'independenceAndDecisionMaking')}
                {renderListSection('Leadership', 'leadership')}
                {renderListSection('Education', 'education')}
                {renderListSection('Years of Experience Preferred', 'yearsOfExperiencePreferred')}

                {/* Removed the "Preferred Experience" section */}
                {/* <div>
                    <label className="block text-sm font-medium mb-1">Preferred Experience</label>
                    <textarea 
                        value={editingJob.experience}
                        onChange={(e) => handleFieldChange('experience', e.target.value)}
                        className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                    />
                </div> */}

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-700">
                    <button onClick={handleCancelEdit} className={`px-4 py-2 rounded-md ${currentTheme.buttonBg}`}>Cancel</button>
                    <button onClick={() => handleSave(editingJob)} className="px-4 py-2 rounded-md bg-green-600 text-white">Save Changes</button>
                </div>
            </div>
        );
    };

    return (
        <div className="p-2">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Manage Job Family Positions</h2>
                <div className="flex gap-4 items-center">
                    <button onClick={handleAddNew} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">+ Add New Position</button>
                    <button onClick={onClose} className="text-2xl font-bold text-gray-400 hover:text-white">&times;</button>
                </div>
            </div>

            <AnimatePresence>
                {editingJob && ( // This condition is crucial
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                    >
                        {renderEditForm()}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="mt-4 space-y-2 max-h-[50vh] overflow-y-auto">
                {jobFamilies.map(job => (
                    <div key={job.id} className={`p-3 rounded-md flex justify-between items-center ${currentTheme.altRowBg}`}>
                        <span className="font-semibold">{job.title}</span>
                        <div className="flex gap-2">
                            {/* Changed onClick to use the new handleEditExisting */}
                            <button onClick={() => { handleEditExisting(job); }} className="text-blue-400 text-sm hover:underline">Edit</button>
                            <button onClick={() => handleDelete(job.id)} className="text-red-400 text-sm hover:underline">Delete</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default JobFamilyEditor;
