import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

const MovableJobFamilyDisplay = ({ jobToDisplay, currentTheme, onClose }) => {
    // Set initial position to bottom-right, accounting for potential modal size
    const [position, setPosition] = useState({ x: window.innerWidth - 500, y: window.innerHeight - 600 }); // Adjusted initial position
    const [isDragging, setIsDragging] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const modalRef = useRef(null);

    // Adjust initial position on mount and window resize
    useEffect(() => {
        const setInitialPosition = () => {
            if (modalRef.current) {
                const modalWidth = modalRef.current.offsetWidth;
                const modalHeight = modalRef.current.offsetHeight;
                setPosition({
                    x: window.innerWidth - modalWidth - 30, // 30px padding from right
                    y: window.innerHeight - modalHeight - 30 // 30px padding from bottom
                });
            } else {
                // Fallback if ref not immediately available
                setPosition({ x: window.innerWidth - 500, y: window.innerHeight - 600 });
            }
        };

        setInitialPosition(); // Set initial position on mount

        window.addEventListener('resize', setInitialPosition); // Adjust on resize
        return () => window.removeEventListener('resize', setInitialPosition);
    }, []); // Empty dependency array means this runs once on mount

    const handleMouseDown = (e) => {
        setIsDragging(true);
        dragOffset.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y,
        };
    };

    const handleMouseMove = useCallback((e) => {
        if (!isDragging) return;
        setPosition(prevPosition => ({
            x: e.clientX - dragOffset.current.x,
            y: e.clientY - dragOffset.current.y,
        }));
    }, [isDragging]);

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    useEffect(() => {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove]);

    if (!jobToDisplay) return null;

    return (
        <motion.div
            ref={modalRef}
            className={`fixed z-50 ${currentTheme.cardBg} p-6 rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col resize overflow-hidden`}
            style={{ left: position.x, top: position.y, cursor: isDragging ? 'grabbing' : 'grab' }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            onMouseDown={(e) => {
                // Only allow dragging from the header
                if (e.target.dataset.dragHandle) {
                    handleMouseDown(e);
                }
            }}
            onClick={e => e.stopPropagation()} // Prevent clicks inside from closing
        >
            <div className="flex justify-between items-center pb-4 mb-4 border-b" data-drag-handle="true">
                <h2 className="text-xl font-bold" data-drag-handle="true">Job Family: {jobToDisplay.title}</h2>
                <button onClick={onClose} className="text-2xl font-bold text-gray-400 hover:text-white">&times;</button>
            </div>
            <div className="flex-grow overflow-y-auto hide-scrollbar-on-hover pr-2 text-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h3 className="font-semibold mb-2 text-base">Primary Responsibilities</h3>
                        <ul className="space-y-1 list-none pl-0">
                            {(jobToDisplay.primaryResponsibilities || []).map((item, index) => (
                                <li key={index} className="flex items-start">
                                    <span className="w-6 flex-shrink-0 text-left">•</span>
                                    <span className="flex-grow text-left">{item}</span>
                                </li>
                            ))}
                        </ul>
                        <h3 className="font-semibold mt-4 mb-2 text-base">Independence and Decision-Making</h3>
                        <ul className="space-y-1 list-none pl-0">
                            {(jobToDisplay.independenceAndDecisionMaking || []).map((item, index) => (
                                <li key={index} className="flex items-start">
                                    <span className="w-6 flex-shrink-0">•</span>
                                    <span className="flex-grow text-left">{item}</span>
                                </li>
                            ))}
                        </ul>
                        <h3 className="font-semibold mt-4 mb-2 text-base">Leadership</h3>
                        <ul className="space-y-1 list-none pl-0">
                            {(jobToDisplay.leadership || []).map((item, index) => (
                                <li key={index} className="flex items-start">
                                    <span className="w-6 flex-shrink-0">•</span>
                                    <span className="flex-grow text-left">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2 text-base">Knowledge and Skills</h3>
                        <ul className="space-y-1 list-none pl-0">
                            {(jobToDisplay.knowledgeAndSkills || []).map((item, index) => (
                                <li key={index} className="flex items-start">
                                    <span className="w-6 flex-shrink-0">•</span>
                                    <span className="flex-grow text-left">{item}</span>
                                </li>
                            ))}
                        </ul>
                        <h3 className="font-semibold mt-4 mb-2 text-base">Education</h3>
                        <ul className="space-y-1 list-none pl-0">
                            {(jobToDisplay.education || []).map((item, index) => (
                                <li key={index} className="flex items-start">
                                    <span className="w-6 flex-shrink-0">•</span>
                                    <span className="flex-grow text-left">{item}</span>
                                </li>
                            ))}
                        </ul>
                        <h3 className="font-semibold mt-4 mb-2 text-base">Years of Experience Preferred</h3>
                        <ul className="space-y-1 list-none pl-0">
                            {(jobToDisplay.yearsOfExperiencePreferred || []).map((item, index) => (
                                <li key={index} className="flex items-start">
                                    <span className="w-6 flex-shrink-0">•</span>
                                    <span className="flex-grow text-left">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default MovableJobFamilyDisplay;
