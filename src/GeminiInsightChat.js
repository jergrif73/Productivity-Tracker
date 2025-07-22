import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const GeminiInsightChat = ({ isVisible, onClose, reportContext, geminiApiKey, currentTheme, jobFamilyData }) => {
    const [messages, setMessages] = useState([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatHistoryRef = useRef([]);
    const chatContainerRef = useRef(null);

    // Effect to scroll to the bottom of the chat on new messages
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    // Effect to set the initial message when the component becomes visible
    useEffect(() => {
        if (isVisible && reportContext) {
            const initialMessage = {
                role: 'model',
                text: `I have analyzed the **${reportContext.type}** report. What specific questions do you have about the data?`
            };
            setMessages([initialMessage]);
            chatHistoryRef.current = []; // Reset history for a new report
            setUserInput('');
        }
    }, [isVisible, reportContext]);

    // Handles sending a message to the Gemini API
    const handleSendMessage = async () => {
        if (!userInput.trim() || isLoading) return;

        const newUserMessage = { role: 'user', text: userInput };
        setMessages(prev => [...prev, newUserMessage]);
        const currentInput = userInput;
        setUserInput('');
        setIsLoading(true);

        let prompt;
        // If this is the first message, prepend the system context
        if (chatHistoryRef.current.length === 0) {
            let dataSample;
            if (reportContext.type === 'employee-details' && reportContext.data[0] && typeof reportContext.data[0] === 'object' && !Array.isArray(reportContext.data[0])) {
                dataSample = reportContext.data.slice(0, 20).map(row => 
                    `${row.attribute}: ${row.values.map(v => v.value).join(', ')}`
                ).join('; ');
            } else {
                dataSample = reportContext.data.slice(0, 20).map(row => row.join(', ')).join('; ');
            }

            // *** FIX STARTS HERE ***
            // The headers for 'employee-details' are objects {id, name}. We need to extract the name.
            // This now handles both string headers and object headers.
            const formattedHeaders = reportContext.headers.map(h => (typeof h === 'object' && h.name) ? h.name : h).join(', ');
            // *** FIX ENDS HERE ***

            const jobFamilyContext = JSON.stringify(jobFamilyData);

            prompt = `
                CONTEXT: You are an expert analyst for a workforce productivity application. The user has generated a report of type "${reportContext.type}". The columns are: ${formattedHeaders}. Here is a sample of the data (rows separated by ';'):
                ${dataSample}

                Additionally, here is the job family data, which defines various positions, their responsibilities, and skills:
                ${jobFamilyContext}
                
                Your role is to answer the user's questions based *only* on this data context. Be concise and helpful. If the user asks for information not present in the data, politely state that you cannot answer. Format your responses with Markdown.
                
                USER QUESTION: ${currentInput}
            `;
        } else {
            prompt = currentInput;
        }

        chatHistoryRef.current.push({ role: 'user', parts: [{ text: prompt }] });
        
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: chatHistoryRef.current })
            });

            if (!response.ok) {
                const errorBody = await response.json();
                console.error("API Error Body:", errorBody);
                throw new Error(`API request failed with status ${response.status}`);
            }

            const result = await response.json();
            if (!result.candidates || result.candidates.length === 0) {
                 throw new Error("No response candidates from API.");
            }
            const modelResponse = result.candidates[0].content.parts[0].text;
            
            const newModelMessage = { role: 'model', text: modelResponse };
            setMessages(prev => [...prev, newModelMessage]);

            chatHistoryRef.current.push({ role: 'model', parts: [{ text: modelResponse }] });

        } catch (err) {
            console.error("Gemini API error:", err);
            const errorMessage = "My apologies, I seem to be having trouble connecting. Please check the API key and configuration.";
            setMessages(prev => [...prev, {role: 'model', text: errorMessage}]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isVisible) return null;

    // Renders message text with basic Markdown support
    const renderMessage = (text) => {
        let htmlText = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-800 p-2 rounded-md my-2 text-sm"><code>$1</code></pre>')
            .replace(/`([^`]+)`/g, '<code class="bg-gray-700 px-1 rounded">$1</code>')
            .replace(/^\* (.*)/gm, '<li class="ml-4 list-disc">$1</li>')
            .replace(/\n/g, '<br />');
        return <div dangerouslySetInnerHTML={{ __html: htmlText }} />;
    };

    return (
        <motion.div
            className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                className="w-full max-w-2xl bg-gray-900 border border-cyan-500/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden h-[80vh]"
                style={{boxShadow: '0 0 25px rgba(0, 255, 255, 0.3)'}}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 bg-gray-800/50 border-b border-cyan-500/30 flex justify-between items-center flex-shrink-0">
                    <h3 className="text-lg font-bold text-cyan-300 tracking-wider">Gemini AI Insights</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>
                
                <div ref={chatContainerRef} className="p-6 flex-grow overflow-y-auto hide-scrollbar-on-hover space-y-4">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-md p-3 rounded-lg text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
                                {renderMessage(msg.text)}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                         <div className="flex justify-start">
                            <div className="max-w-md p-3 rounded-lg bg-gray-700 text-gray-200 flex items-center space-x-2">
                                <motion.div className="w-2 h-2 bg-cyan-300 rounded-full" animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />
                                <motion.div className="w-2 h-2 bg-cyan-300 rounded-full" animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }} />
                                <motion.div className="w-2 h-2 bg-cyan-300 rounded-full" animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }} />
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-gray-800/50 border-t border-cyan-500/30 flex items-center gap-2 flex-shrink-0">
                    <input
                        type="text"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Ask about the report..."
                        className="flex-grow p-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        disabled={isLoading}
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={isLoading || !userInput.trim()}
                        className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
                    >
                        Send
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default GeminiInsightChat;
