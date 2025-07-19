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
        // A simple confirmation dialog
        if (window.confirm("Are you sure you want to delete this position? This action cannot be undone.")) {
            const docRef = doc(db, `artifacts/${appId}/public/data/jobFamilyData`, id);
            await deleteDoc(docRef);
        }
    };
    
    const handleAddNew = () => {
        setEditingJob({
            title: '',
            primaryResponsibilities: ['New Responsibility'],
            knowledgeAndSkills: ['New Skill'],
            experience: ''
        });
        setIsCreating(true);
    };

    const handleCancelEdit = () => {
        setEditingJob(null);
        setIsCreating(false);
    };

    const handleFieldChange = (field, value) => {
        setEditingJob(prev => ({ ...prev, [field]: value }));
    };

    const handleListChange = (field, index, value) => {
        const newList = [...editingJob[field]];
        newList[index] = value;
        setEditingJob(prev => ({ ...prev, [field]: newList }));
    };

    const handleAddListItem = (field) => {
        setEditingJob(prev => ({ ...prev, [field]: [...prev[field], 'New Item'] }));
    };
    
    const handleRemoveListItem = (field, index) => {
        const newList = [...editingJob[field]];
        newList.splice(index, 1);
        setEditingJob(prev => ({ ...prev, [field]: newList }));
    };

    const renderEditForm = () => (
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
            
            <div>
                <label className="block text-sm font-medium mb-1">Primary Responsibilities</label>
                {editingJob.primaryResponsibilities.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 mb-1">
                        <input type="text" value={item} onChange={(e) => handleListChange('primaryResponsibilities', index, e.target.value)} className={`flex-grow p-1 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
                        <button onClick={() => handleRemoveListItem('primaryResponsibilities', index)} className="text-red-500 font-bold text-xl">&times;</button>
                    </div>
                ))}
                <button onClick={() => handleAddListItem('primaryResponsibilities')} className="text-blue-400 text-sm mt-1 hover:underline">+ Add Responsibility</button>
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">Knowledge and Skills</label>
                {editingJob.knowledgeAndSkills.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 mb-1">
                        <input type="text" value={item} onChange={(e) => handleListChange('knowledgeAndSkills', index, e.target.value)} className={`flex-grow p-1 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`} />
                        <button onClick={() => handleRemoveListItem('knowledgeAndSkills', index)} className="text-red-500 font-bold text-xl">&times;</button>
                    </div>
                ))}
                <button onClick={() => handleAddListItem('knowledgeAndSkills')} className="text-blue-400 text-sm mt-1 hover:underline">+ Add Skill</button>
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">Preferred Experience</label>
                <textarea 
                    value={editingJob.experience}
                    onChange={(e) => handleFieldChange('experience', e.target.value)}
                    className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-700">
                <button onClick={handleCancelEdit} className={`px-4 py-2 rounded-md ${currentTheme.buttonBg}`}>Cancel</button>
                <button onClick={() => handleSave(editingJob)} className="px-4 py-2 rounded-md bg-green-600 text-white">Save Changes</button>
            </div>
        </div>
    );

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
                {editingJob && (
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
                            <button onClick={() => { setEditingJob(job); setIsCreating(false); }} className="text-blue-400 text-sm hover:underline">Edit</button>
                            <button onClick={() => handleDelete(job.id)} className="text-red-400 text-sm hover:underline">Delete</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default JobFamilyEditor;
