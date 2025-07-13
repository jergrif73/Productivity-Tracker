import React, { useState, useEffect } from 'react';
import { collection, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';

// Note: Modal, ConfirmationModal, and Tooltip would also be in their own files.
const Modal = ({ children, onClose, customClasses = 'max-w-4xl', currentTheme }) => {
    const theme = currentTheme || { cardBg: 'bg-white', textColor: 'text-gray-800', subtleText: 'text-gray-600' };
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center">
            <div className={`${theme.cardBg} ${theme.textColor} p-6 rounded-lg shadow-2xl w-full ${customClasses} max-h-[90vh] overflow-y-auto`}>
                <div className="flex justify-end">
                    <button onClick={onClose} className={`text-2xl font-bold ${theme.subtleText} hover:${theme.textColor}`}>&times;</button>
                </div>
                {children}
            </div>
        </div>
    );
};

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, children, currentTheme }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center">
            <div className={`${currentTheme.cardBg} ${currentTheme.textColor} p-6 rounded-lg shadow-2xl w-full max-w-md`}>
                <h3 className="text-lg font-bold mb-4">{title}</h3>
                <div className={`mb-6 ${currentTheme.subtleText}`}>{children}</div>
                <div className="flex justify-end gap-4">
                    <button onClick={onClose} className={`px-4 py-2 rounded-md ${currentTheme.buttonBg} hover:bg-opacity-80`}>Cancel</button>
                    <button onClick={onConfirm} className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700">Confirm</button>
                </div>
            </div>
        </div>
    );
};

const Tooltip = ({ text, children }) => {
    const [visible, setVisible] = useState(false);
    return (
        <div className="relative flex items-center justify-center" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
            {children}
            {visible && text && (
                <div className="absolute bottom-full mb-2 w-max px-2 py-1 bg-gray-800 text-white text-xs rounded-md z-10">
                    {text}
                </div>
            )}
        </div>
    );
};


const CommentSection = ({ comments, onAddComment, onUpdateComment, onDeleteComment, currentTheme }) => {
    const [newComment, setNewComment] = useState('');
    const [author, setAuthor] = useState('');
    const [editingComment, setEditingComment] = useState(null);

    const handleAdd = () => {
        const commentData = {
            id: `comment_${Date.now()}`,
            author: author.toUpperCase(),
            text: newComment,
            timestamp: new Date().toISOString()
        };
        onAddComment(commentData);
        setNewComment('');
        setAuthor('');
    };

    const handleUpdate = () => {
        onUpdateComment(editingComment.id, editingComment.text);
        setEditingComment(null);
    };

    return (
        <div className="mt-4 space-y-3">
            <div className="space-y-2">
                {(comments || []).map(comment => (
                    <div key={comment.id} className={`${currentTheme.altRowBg} p-2 rounded-md text-sm`}>
                         {editingComment?.id === comment.id ? (
                            <div className="space-y-2">
                                <textarea 
                                    value={editingComment.text} 
                                    onChange={(e) => setEditingComment({...editingComment, text: e.target.value})}
                                    className={`w-full p-2 border rounded-md text-sm ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                                />
                                <div className="flex gap-2">
                                    <button onClick={handleUpdate} className="px-3 py-1 bg-green-500 text-white rounded text-xs">Save</button>
                                    <button onClick={() => setEditingComment(null)} className="px-3 py-1 bg-gray-400 text-white rounded text-xs">Cancel</button>
                                </div>
                            </div>
                         ) : (
                            <div>
                                <p className={currentTheme.textColor}>{comment.text}</p>
                                <div className={`flex justify-between items-center mt-1 ${currentTheme.subtleText} text-xs`}>
                                    <span><strong>{comment.author}</strong> - {new Date(comment.timestamp).toLocaleString()}</span>
                                    <div className="flex gap-2">
                                        <button onClick={() => setEditingComment({id: comment.id, text: comment.text})} className="hover:underline">Edit</button>
                                        <button onClick={() => onDeleteComment(comment.id)} className="hover:underline text-red-500">Delete</button>
                                    </div>
                                </div>
                            </div>
                         )}
                    </div>
                ))}
            </div>
            <div className="border-t pt-3 space-y-2">
                 <textarea 
                    value={newComment} 
                    onChange={e => setNewComment(e.target.value)} 
                    placeholder="Add a comment..." 
                    className={`w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                />
                <div className="flex gap-2 items-center">
                    <input 
                        type="text" 
                        value={author} 
                        onChange={e => setAuthor(e.target.value.toUpperCase())}
                        placeholder="Initials"
                        maxLength="3"
                        className={`p-2 border rounded-md w-20 ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                    />
                    <button 
                        onClick={handleAdd}
                        disabled={!newComment || author.length !== 3}
                        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400"
                    >
                        Post Comment
                    </button>
                </div>
            </div>
        </div>
    );
};

const AttachmentSectionURL = ({ attachments, onAdd, onUpdate, onDelete, currentTheme }) => {
    const [newAttachment, setNewAttachment] = useState({ name: '', url: '' });
    const [editingAttachment, setEditingAttachment] = useState(null);

    const handleAdd = () => {
        if (newAttachment.name && newAttachment.url) {
            onAdd(newAttachment);
            setNewAttachment({ name: '', url: '' });
        }
    };

    const handleUpdate = () => {
        if (editingAttachment.name && editingAttachment.url) {
            onUpdate(editingAttachment);
            setEditingAttachment(null);
        }
    };

    return (
        <div className="mt-2 space-y-3">
            {(attachments || []).map(att => (
                <div key={att.id} className={`p-2 rounded ${currentTheme.cardBg} border ${currentTheme.borderColor}`}>
                    {editingAttachment?.id === att.id ? (
                        <div className="space-y-2">
                            <input
                                type="text"
                                placeholder="Attachment Name"
                                value={editingAttachment.name}
                                onChange={e => setEditingAttachment({ ...editingAttachment, name: e.target.value })}
                                className={`w-full p-1 border rounded text-sm ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                            />
                            <input
                                type="text"
                                placeholder="https://example.com"
                                value={editingAttachment.url}
                                onChange={e => setEditingAttachment({ ...editingAttachment, url: e.target.value })}
                                className={`w-full p-1 border rounded text-sm ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                            />
                            <div className="flex gap-2">
                                <button onClick={handleUpdate} className="text-xs bg-green-500 text-white px-2 py-1 rounded">Save</button>
                                <button onClick={() => setEditingAttachment(null)} className="text-xs bg-gray-400 text-white px-2 py-1 rounded">Cancel</button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between gap-2 text-sm">
                            <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline truncate">
                                {att.name}
                            </a>
                            <div className="flex gap-2">
                                <button onClick={() => setEditingAttachment({ ...att })} className="text-xs text-blue-500 hover:underline">Edit</button>
                                <button onClick={() => onDelete(att.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                            </div>
                        </div>
                    )}
                </div>
            ))}
            <div className="flex items-center gap-2 pt-3 border-t border-dashed mt-3">
                <input
                    type="text"
                    placeholder="Attachment Name"
                    value={newAttachment.name}
                    onChange={e => setNewAttachment({ ...newAttachment, name: e.target.value })}
                    className={`flex-grow p-2 border rounded-md text-sm ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                />
                <input
                    type="text"
                    placeholder="https://example.com"
                    value={newAttachment.url}
                    onChange={e => setNewAttachment({ ...newAttachment, url: e.target.value })}
                    className={`flex-grow p-2 border rounded-md text-sm ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`}
                />
                <button onClick={handleAdd} className="bg-blue-500 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-600">Add Link</button>
            </div>
        </div>
    );
};


const taskStatusOptions = ["Not Started", "In Progress", "Completed", "Deleted"];

const TaskDetailModal = ({ db, task, projects, detailers, onSave, onClose, onDelete, currentTheme, appId }) => {
    const [taskData, setTaskData] = useState(null);
    const [newSubTask, setNewSubTask] = useState({ name: '', detailerId: '', dueDate: '' });
    const [editingSubTaskId, setEditingSubTaskId] = useState(null);
    const [editingSubTaskData, setEditingSubTaskData] = useState(null);
    const [newWatcherId, setNewWatcherId] = useState('');
    const [isNewTask, setIsNewTask] = useState(true);
    const [modalMessage, setModalMessage] = useState(null);
    
    useEffect(() => {
        if (task && task.id) {
            const subTasksWithDetails = (task.subTasks || []).map(st => ({
                ...st, 
                comments: st.comments || [],
                attachments: st.attachments || []
            }));
            setTaskData({
                ...task, 
                comments: task.comments || [], 
                attachments: task.attachments || [], 
                subTasks: subTasksWithDetails
            });
            setIsNewTask(false);
        } else {
            setTaskData({
                taskName: '', projectId: '', detailerId: '', status: taskStatusOptions[0], dueDate: '',
                entryDate: new Date().toISOString().split('T')[0],
                subTasks: [], 
                watchers: [], 
                comments: [],
                attachments: []
            });
            setIsNewTask(true);
        }
    }, [task]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setTaskData(prev => ({...prev, [name]: value}));
    };
    
    const handleSubTaskChange = (e) => {
        const { name, value } = e.target;
        setNewSubTask(prev => ({...prev, [name]: value}));
    };
    
    const handleAddSubTask = () => {
        if (!newSubTask.name) return;
        
        const subTaskToAdd = { ...newSubTask, id: `sub_${Date.now()}`, isCompleted: false, comments: [], attachments: [] };
        setTaskData(prev => ({...prev, subTasks: [...(prev.subTasks || []), subTaskToAdd]}));
        setNewSubTask({ name: '', detailerId: '', dueDate: '' });
    };

    const handleStartEditSubTask = (subTask) => {
        setEditingSubTaskId(subTask.id);
        setEditingSubTaskData({...subTask});
    };

    const handleCancelEditSubTask = () => {
        setEditingSubTaskId(null);
        setEditingSubTaskData(null);
    };

    const handleEditingSubTaskDataChange = (e) => {
        const { name, value } = e.target;
        setEditingSubTaskData(prev => ({...prev, [name]: value}));
    };
    
    const handleUpdateSubTask = () => {
        const updatedSubTasks = taskData.subTasks.map(st => st.id === editingSubTaskId ? editingSubTaskData : st);
        setTaskData(prev => ({...prev, subTasks: updatedSubTasks}));
        handleCancelEditSubTask();
    };
    
    const handleToggleSubTask = (subTaskId) => {
        const updatedSubTasks = taskData.subTasks.map(st => st.id === subTaskId ? { ...st, isCompleted: !st.isCompleted } : st);
        const completedCount = updatedSubTasks.filter(st => st.isCompleted).length;
        let newStatus = taskStatusOptions[0];
        if (completedCount > 0) {
            newStatus = completedCount === updatedSubTasks.length ? taskStatusOptions[2] : taskStatusOptions[1];
        }
        setTaskData(prev => ({ ...prev, subTasks: updatedSubTasks, status: newStatus }));
    };
    
    const handleDeleteSubTask = (subTaskId) => {
        setTaskData(prev => ({ ...prev, subTasks: taskData.subTasks.filter(st => st.id !== subTaskId) }));
    };

    const handleAddWatcher = () => {
      if (newWatcherId && !taskData.watchers.includes(newWatcherId)) {
          setTaskData(prev => ({ ...prev, watchers: [...prev.watchers, newWatcherId] }));
          setNewWatcherId('');
      }
    };

    const handleRemoveWatcher = (watcherIdToRemove) => {
        setTaskData(prev => ({
            ...prev,
            watchers: prev.watchers.filter(id => id !== watcherIdToRemove)
        }));
    };

    const handleAddComment = (commentData, subTaskId = null) => {
        if (!commentData.text.trim() || !commentData.author || commentData.author.trim().length !== 3) {
            setModalMessage({ text: "A comment and 3-letter initials are required.", type: 'error' });
            setTimeout(() => setModalMessage(null), 3000);
            return;
        }

        let updatedTaskData;
        if (subTaskId) {
            updatedTaskData = {
                ...taskData,
                subTasks: taskData.subTasks.map(st => st.id === subTaskId ? { ...st, comments: [...(st.comments || []), commentData] } : st)
            };
        } else {
            updatedTaskData = { ...taskData, comments: [...(taskData.comments || []), commentData] };
        }
        setTaskData(updatedTaskData);
    };

    const handleUpdateComment = (commentId, newText, subTaskId = null) => {
        let updatedTaskData;
        if (subTaskId) {
             updatedTaskData = {
                ...taskData,
                subTasks: taskData.subTasks.map(st => {
                    if (st.id === subTaskId) {
                        return { ...st, comments: st.comments.map(c => c.id === commentId ? {...c, text: newText} : c) }
                    }
                    return st;
                })
             }
        } else {
             updatedTaskData = {
                ...taskData,
                comments: taskData.comments.map(c => c.id === commentId ? {...c, text: newText} : c)
             }
        }
        setTaskData(updatedTaskData);
    };

    const handleDeleteComment = (commentId, subTaskId = null) => {
        let updatedTaskData;
        if (subTaskId) {
             updatedTaskData = {
                ...taskData,
                subTasks: taskData.subTasks.map(st => {
                    if (st.id === subTaskId) {
                        return { ...st, comments: st.comments.filter(c => c.id !== commentId) }
                    }
                    return st;
                })
             }
        } else {
             updatedTaskData = {
                ...taskData,
                comments: taskData.comments.filter(c => c.id !== commentId)
             }
        }
        setTaskData(updatedTaskData);
    };

    const handleAddAttachmentURL = (newAttachment, subTaskId = null) => {
        const attachmentWithId = { ...newAttachment, id: `att_${Date.now()}` };
        if (subTaskId) {
            setTaskData(prev => ({
                ...prev,
                subTasks: prev.subTasks.map(st => 
                    st.id === subTaskId 
                    ? { ...st, attachments: [...(st.attachments || []), attachmentWithId] } 
                    : st
                )
            }));
        } else {
            setTaskData(prev => ({ ...prev, attachments: [...(prev.attachments || []), attachmentWithId] }));
        }
    };

    const handleUpdateAttachmentURL = (updatedAttachment, subTaskId = null) => {
        if (subTaskId) {
            setTaskData(prev => ({
                ...prev,
                subTasks: prev.subTasks.map(st => {
                    if (st.id === subTaskId) {
                        return { ...st, attachments: st.attachments.map(att => att.id === updatedAttachment.id ? updatedAttachment : att) };
                    }
                    return st;
                })
            }));
        } else {
            setTaskData(prev => ({
                ...prev,
                attachments: prev.attachments.map(att => att.id === updatedAttachment.id ? updatedAttachment : att)
            }));
        }
    };

    const handleDeleteAttachmentURL = (attachmentId, subTaskId = null) => {
        if (subTaskId) {
            setTaskData(prev => ({
                ...prev,
                subTasks: prev.subTasks.map(st => {
                    if (st.id === subTaskId) {
                        return { ...st, attachments: st.attachments.filter(att => att.id !== attachmentId) };
                    }
                    return st;
                })
            }));
        } else {
            setTaskData(prev => ({
                ...prev,
                attachments: prev.attachments.filter(att => att.id !== attachmentId)
            }));
        }
    };
    
    if (!taskData) return null;
    
    const hasSubtasks = taskData.subTasks && taskData.subTasks.length > 0;
    const formElementClasses = `w-full p-2 border rounded-md ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder}`;

    return (
        <Modal onClose={onClose} currentTheme={currentTheme}>
            <div className="relative">
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold">{isNewTask ? 'Add New Task' : 'Edit Task'}</h2>
                    
                    <div className={`p-4 border rounded-lg space-y-3 ${currentTheme.altRowBg}`}>
                        <input type="text" name="taskName" value={taskData.taskName} onChange={handleChange} placeholder="Task Name" className={`text-lg font-semibold ${formElementClasses}`} />
                        <div className="grid grid-cols-2 gap-4">
                            <select name="projectId" value={taskData.projectId} onChange={handleChange} className={formElementClasses}>
                                <option value="">Select Project...</option>
                                {projects.filter(p => !p.archived).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <select name="detailerId" value={taskData.detailerId} onChange={handleChange} className={formElementClasses}>
                                <option value="">Assign To...</option>
                                {detailers.map(d => <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>)}
                            </select>
                            <input type="date" name="dueDate" value={taskData.dueDate} onChange={handleChange} className={formElementClasses}/>
                            <p className={`p-2 text-sm ${currentTheme.subtleText}`}>Entry: {new Date(taskData.entryDate).toLocaleDateString()}</p>
                        </div>
                    </div>

                    <div className={`p-4 border rounded-lg ${currentTheme.altRowBg}`}>
                        <h3 className="font-semibold mb-2">Watchers</h3>
                        <div className="flex flex-wrap gap-2 mb-4">
                            {(taskData.watchers || []).map(watcherId => {
                                const watcher = detailers.find(d => d.id === watcherId);
                                return (
                                    <span key={watcherId} className="bg-gray-200 text-gray-800 text-sm font-medium mr-2 px-2.5 py-0.5 rounded-full flex items-center">
                                        {watcher ? `${watcher.firstName} ${watcher.lastName}` : 'Unknown'}
                                        <button onClick={() => handleRemoveWatcher(watcherId)} className="ml-2 text-gray-500 hover:text-gray-800 font-bold">&times;</button>
                                    </span>
                                );
                            })}
                        </div>
                        <div className="flex gap-2 items-center border-t pt-4">
                            <select
                                value={newWatcherId}
                                onChange={(e) => setNewWatcherId(e.target.value)}
                                className={`flex-grow ${formElementClasses}`}
                            >
                                <option value="">Add a watcher...</option>
                                {detailers.map(d => (
                                    <option key={d.id} value={d.id}>
                                        {d.firstName} {d.lastName}
                                    </option>
                                ))}
                            </select>
                            <button onClick={handleAddWatcher} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
                                Add
                            </button>
                        </div>
                    </div>

                    <div className={`p-4 border rounded-lg ${currentTheme.altRowBg}`}>
                        <h3 className="font-semibold mb-2">Sub-tasks</h3>
                        <div className="space-y-4 mb-4 max-h-60 overflow-y-auto">
                            {(taskData.subTasks || []).map(st => (
                                <div key={st.id} className={`p-2 ${currentTheme.cardBg} rounded`}>
                                    {editingSubTaskId === st.id ? (
                                        <div className="flex gap-2 items-center">
                                            <input type="text" name="name" value={editingSubTaskData.name} onChange={handleEditingSubTaskDataChange} className={`flex-grow ${formElementClasses}`}/>
                                            <select name="detailerId" value={editingSubTaskData.detailerId} onChange={handleEditingSubTaskDataChange} className={`text-sm ${formElementClasses}`}><option value="">Assignee...</option>{detailers.map(d => <option key={d.id} value={d.id}>{d.lastName}</option>)}</select>
                                            <input type="date" name="dueDate" value={editingSubTaskData.dueDate} onChange={handleEditingSubTaskDataChange} className={`text-sm ${formElementClasses}`}/>
                                            <button onClick={handleUpdateSubTask} className="px-3 py-1 bg-green-500 text-white rounded-md text-sm hover:bg-green-600">Save</button>
                                            <button onClick={handleCancelEditSubTask} className="px-3 py-1 bg-gray-400 text-white rounded-md text-sm hover:bg-gray-500">X</button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <input type="checkbox" checked={st.isCompleted} onChange={() => handleToggleSubTask(st.id)} className="h-5 w-5 rounded text-blue-600"/>
                                            <span className={`flex-grow ${st.isCompleted ? 'line-through text-gray-500' : ''}`}>{st.name}</span>
                                            <span className={`text-xs ${currentTheme.subtleText}`}>{detailers.find(d => d.id === st.detailerId)?.lastName}</span>
                                            <span className={`text-xs ${currentTheme.subtleText}`}>{st.dueDate}</span>
                                            <button onClick={() => handleStartEditSubTask(st)} className="text-xs text-blue-600 hover:underline" disabled={editingSubTaskId}>Edit</button>
                                            <button onClick={() => handleDeleteSubTask(st.id)} className="text-red-400 hover:text-red-600 text-xl" disabled={editingSubTaskId}>&times;</button>
                                        </div>
                                    )}
                                    <div className="pl-6">
                                        <AttachmentSectionURL
                                            attachments={st.attachments}
                                            onAdd={(att) => handleAddAttachmentURL(att, st.id)}
                                            onUpdate={(att) => handleUpdateAttachmentURL(att, st.id)}
                                            onDelete={(id) => handleDeleteAttachmentURL(id, st.id)}
                                            currentTheme={currentTheme}
                                        />
                                        <CommentSection 
                                           comments={st.comments}
                                           onAddComment={(commentData) => handleAddComment(commentData, st.id)}
                                           onUpdateComment={(id, text) => handleUpdateComment(id, text, st.id)}
                                           onDeleteComment={(id) => handleDeleteComment(id, st.id)}
                                           currentTheme={currentTheme}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2 items-center p-2 border-t">
                            <input type="text" placeholder="New sub-task..." name="name" value={newSubTask.name} onChange={handleSubTaskChange} className={`flex-grow ${formElementClasses}`} />
                            <select name="detailerId" value={newSubTask.detailerId} onChange={handleSubTaskChange} className={`text-sm ${formElementClasses}`}>
                                <option value="">Assignee...</option>
                                {detailers.map(d => <option key={d.id} value={d.id}>{d.lastName}</option>)}
                            </select>
                            <input type="date" name="dueDate" value={newSubTask.dueDate} onChange={handleSubTaskChange} className={`text-sm ${formElementClasses}`} />
                            <button onClick={handleAddSubTask} className="px-3 py-1 bg-gray-200 rounded-md text-sm hover:bg-gray-300">Add</button>
                        </div>
                    </div>
                    
                     <div className={`p-4 border rounded-lg ${currentTheme.altRowBg}`}>
                         <h3 className="font-semibold mb-2">Task Attachments</h3>
                         <AttachmentSectionURL
                            attachments={taskData.attachments}
                            onAdd={handleAddAttachmentURL}
                            onUpdate={handleUpdateAttachmentURL}
                            onDelete={handleDeleteAttachmentURL}
                            currentTheme={currentTheme}
                         />
                    </div>
                    
                     <div className={`p-4 border rounded-lg ${currentTheme.altRowBg}`}>
                         <h3 className="font-semibold mb-2">Task Comments</h3>
                         <CommentSection 
                           comments={taskData.comments}
                           onAddComment={handleAddComment}
                           onUpdateComment={handleUpdateComment}
                           onDeleteComment={handleDeleteComment}
                           currentTheme={currentTheme}
                         />
                    </div>

                    {modalMessage && (
                        <div className={`p-2 text-center text-sm rounded-md ${modalMessage.type === 'error' ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'}`}>
                            {modalMessage.text}
                        </div>
                    )}

                    <div className="flex justify-end gap-4 pt-4">
                        {!isNewTask && (
                           <Tooltip text={hasSubtasks ? "Delete all sub-tasks first" : ""}>
                                <div className="mr-auto">
                                    <button
                                        onClick={onDelete}
                                        disabled={hasSubtasks}
                                        className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                    >
                                        Delete Task
                                    </button>
                                </div>
                            </Tooltip>
                        )}
                        <button onClick={onClose} className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300">Cancel</button>
                        <button onClick={() => onSave(taskData)} className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700">Save All Changes</button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};


const TaskCard = ({ task, detailers, onDragStart, onClick, currentTheme }) => {
    const watchers = (task.watchers || []).map(wId => detailers.find(d => d.id === wId)).filter(Boolean);
    const subTasks = task.subTasks || [];
    const completedSubTasks = subTasks.filter(st => st.isCompleted).length;
    const assignee = detailers.find(d => d.id === task.detailerId);

    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, task.id)}
            onClick={onClick}
            className={`${currentTheme.cardBg} p-3 rounded-lg border ${currentTheme.borderColor} shadow-sm cursor-pointer mb-3 ${currentTheme.textColor}`}
        >
            <p className="font-semibold mb-2">{task.taskName}</p>
            <div className={`flex items-center justify-between text-xs ${currentTheme.subtleText} mt-2`}>
                <span className={task.dueDate ? '' : 'opacity-50'}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    {task.dueDate || 'No due date'}
                </span>
                <div className="flex items-center gap-2">
                    {subTasks.length > 0 && (
                        <span className="flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                            <path fillRule="evenodd" d="M4 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h4a1 1 0 100-2H7zm0 4a1 1 0 100 2h4a1 1 0 100-2H7z" clipRule="evenodd" />
                          </svg>
                          {completedSubTasks}/{subTasks.length}
                        </span>
                    )}
                     <div className="flex -space-x-2">
                        {assignee && (
                             <Tooltip text={`Assignee: ${assignee.firstName} ${assignee.lastName}`}>
                                 <span className={`w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs border-2 ${currentTheme.borderColor}`}>
                                     {assignee.firstName.charAt(0)}{assignee.lastName.charAt(0)}
                                 </span>
                            </Tooltip>
                        )}
                        {watchers.slice(0, 2).map(watcher => (
                            <Tooltip key={watcher.id} text={`${watcher.firstName} ${watcher.lastName}`}>
                                 <span className={`w-6 h-6 rounded-full bg-gray-500 flex items-center justify-center text-white text-xs border-2 ${currentTheme.borderColor}`}>
                                     {watcher.firstName.charAt(0)}{watcher.lastName.charAt(0)}
                                 </span>
                            </Tooltip>
                        ))}
                     </div>
                </div>
            </div>
        </div>
    );
};


const TaskConsole = ({ db, tasks, detailers, projects, taskLanes, appId, showToast, currentTheme }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [editingLaneId, setEditingLaneId] = useState(null);
    const [editingLaneName, setEditingLaneName] = useState('');
    const [taskToDelete, setTaskToDelete] = useState(null);
    const [confirmAction, setConfirmAction] = useState(null);

    const handleOpenModal = (task = null) => {
        setEditingTask(task);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingTask(null);
    };
    
    const handleSoftDeleteTask = async (taskId) => {
        if (!taskId) return;
        const taskRef = doc(db, `artifacts/${appId}/public/data/tasks`, taskId);
        await updateDoc(taskRef, { status: 'Deleted' });
        showToast("Task deleted successfully!");
        handleCloseModal(); 
        setTaskToDelete(null); 
    };

    const handleSaveTask = async (taskData) => {
        const isNew = !taskData.id;
       
        try {
            if (isNew) {
                const newRequestsLane = taskLanes.find(l => l.name === "New Requests");
                if (!newRequestsLane) {
                    showToast("Error: 'New Requests' lane not found.", 'error');
                    return;
                }
                const { id, ...data } = taskData;
                data.laneId = newRequestsLane.id;
                await addDoc(collection(db, `artifacts/${appId}/public/data/tasks`), data);
                showToast("Task created!");
            } else {
                const { id, ...data } = taskData;
                const taskRef = doc(db, `artifacts/${appId}/public/data/tasks`, id);
                await updateDoc(taskRef, data);
                showToast("Task updated successfully!");
            }
            handleCloseModal();
        } catch (error) {
            console.error("Error saving task: ", error);
            showToast(`Error saving task: ${error.message}`, 'error');
        }
    };

    const handleDragStart = (e, taskId) => {
        e.dataTransfer.setData("taskId", taskId);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleDrop = async (e, targetLaneId) => {
        const taskId = e.dataTransfer.getData("taskId");
        const taskRef = doc(db, `artifacts/${appId}/public/data/tasks`, taskId);
        await updateDoc(taskRef, { laneId: targetLaneId });
    };

    const handleAddLane = async () => {
        const newLaneName = prompt("Enter new lane name:");
        if (newLaneName && newLaneName.trim() !== '') {
            const newLane = {
                name: newLaneName.trim(),
                order: taskLanes.length,
            };
            await addDoc(collection(db, `artifacts/${appId}/public/data/taskLanes`), newLane);
            showToast(`Lane '${newLaneName}' added.`);
        }
    };
    
    const handleRenameLane = async (laneId) => {
        if (!editingLaneName.trim()) {
            setEditingLaneId(null);
            return;
        };
        const laneRef = doc(db, `artifacts/${appId}/public/data/taskLanes`, laneId);
        await updateDoc(laneRef, { name: editingLaneName });
        setEditingLaneId(null);
        setEditingLaneName('');
    };
    
    const confirmDeleteLane = (lane) => {
        const tasksInLane = tasks.filter(t => t.laneId === lane.id && t.status !== 'Deleted');
        if (tasksInLane.length > 0) {
            showToast("Cannot delete a lane that contains tasks.", "error");
            return;
        }
        setConfirmAction({
            title: "Delete Lane",
            message: `Are you sure you want to delete the lane "${lane.name}"? This action cannot be undone.`,
            action: async () => {
                await deleteDoc(doc(db, `artifacts/${appId}/public/data/taskLanes`, lane.id));
                showToast("Lane deleted.");
            }
        });
    };

    return (
        <div className="flex flex-col h-full">
            <ConfirmationModal
                isOpen={!!confirmAction}
                onClose={() => setConfirmAction(null)}
                onConfirm={() => {
                    if(confirmAction?.action) confirmAction.action();
                    setConfirmAction(null);
                }}
                title={confirmAction?.title}
                currentTheme={currentTheme}
            >
                {confirmAction?.message}
            </ConfirmationModal>

             <div className="flex-grow overflow-x-auto p-4">
                 <div className="flex space-x-4 h-full">
                     {taskLanes.map(lane => (
                         <div
                             key={lane.id}
                             onDragOver={handleDragOver}
                             onDrop={(e) => handleDrop(e, lane.id)}
                             className={`${currentTheme.altRowBg} rounded-lg p-3 w-72 flex-shrink-0 flex flex-col`}
                         >
                            <div className={`flex justify-between items-center mb-4 ${currentTheme.textColor}`}>
                               { editingLaneId === lane.id ? (
                                   <input
                                      type="text"
                                      value={editingLaneName}
                                      onChange={(e) => setEditingLaneName(e.target.value)}
                                      onBlur={() => handleRenameLane(lane.id)}
                                      onKeyPress={(e) => e.key === 'Enter' && handleRenameLane(lane.id)}
                                      className={`font-semibold p-1 rounded-md border ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputBorder} w-full`}
                                      autoFocus
                                   />
                               ) : (
                                   <h2 className="font-semibold cursor-pointer" onClick={() => { setEditingLaneId(lane.id); setEditingLaneName(lane.name); }}>{lane.name}</h2>
                               )}
                                <button onClick={() => confirmDeleteLane(lane)} className={`${currentTheme.subtleText} hover:text-red-500 disabled:opacity-20`} disabled={tasks.some(t => t.laneId === lane.id && t.status !== 'Deleted')}>&times;</button>
                            </div>

                             {lane.name === "New Requests" && (
                                 <button onClick={() => handleOpenModal(null)} className={`w-full text-left p-2 mb-3 ${currentTheme.cardBg} ${currentTheme.textColor} rounded-md shadow-sm hover:bg-opacity-80`}>+ Add Task</button>
                             )}

                             <div className="flex-grow overflow-y-auto pr-2">
                                 {tasks.filter(t => t.laneId === lane.id && t.status !== 'Deleted').map(task => (
                                     <TaskCard
                                         key={task.id}
                                         task={task}
                                         detailers={detailers}
                                         onDragStart={handleDragStart}
                                         onClick={() => handleOpenModal(task)}
                                         currentTheme={currentTheme}
                                     />
                                 ))}
                             </div>
                         </div>
                     ))}
                      <div className="w-72 flex-shrink-0">
                         <button onClick={handleAddLane} className={`w-full p-3 ${currentTheme.buttonBg} ${currentTheme.buttonText} rounded-lg hover:bg-opacity-80`}>+ Add Another List</button>
                      </div>
                 </div>
             </div>
            {isModalOpen && (
                <Modal onClose={handleCloseModal} currentTheme={currentTheme}>
                    <TaskDetailModal
                        db={db}
                        task={editingTask}
                        detailers={detailers}
                        projects={projects}
                        onClose={handleCloseModal}
                        onSave={handleSaveTask}
                        onDelete={() => setTaskToDelete(editingTask)}
                        currentTheme={currentTheme}
                        appId={appId}
                    />
                </Modal>
            )}
             {taskToDelete && (
                <ConfirmationModal
                    isOpen={!!taskToDelete}
                    onClose={() => setTaskToDelete(null)}
                    onConfirm={() => handleSoftDeleteTask(taskToDelete.id)}
                    title="Confirm Task Deletion"
                    currentTheme={currentTheme}
                >
                    Are you sure you want to delete the task "{taskToDelete.taskName}"? This will hide it from all active views.
                </ConfirmationModal>
             )}
        </div>
    );
};

export default TaskConsole;
