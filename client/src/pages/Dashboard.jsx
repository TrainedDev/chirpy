import { useState, useEffect, useRef, useCallback } from "react";
import {
  FiMenu,
  FiSearch,
  FiMessageSquare,
  FiUsers,
  FiSettings,
  FiLogOut,
} from "react-icons/fi";
import { IoMdSend } from "react-icons/io";
import { BsEmojiSmile, BsPaperclip } from "react-icons/bs";
import { RiChatNewLine } from "react-icons/ri";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import axios from "axios";
import { io } from "socket.io-client";

const ChatApp = () => {
  // State management (keep your existing state)
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeChat, setActiveChat] = useState(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [userProfile, setUserProfile] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  // Refs (keep your existing refs)
  const socketRef = useRef(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const navigate = useNavigate();

  // API configuration (keep your existing config)
  const API_CONFIG = {
    baseUrl: import.meta.env.VITE_API_BASE_URL,
    chatUrl: import.meta.env.VITE_API_SOCKET_BASE_URL,
    endpoints: {
      profile: "/auth/user/profile",
      allUsers: "/auth/fetch/users",
      messages: "/user/messages",
      upload: "/user/upload/files",
    },
  };

  // Enhanced token management
  const fetchTokenWithRetry = async (retries = 3, delay = 1000) => {
    try {
      const response = await axios.get(
        `${API_CONFIG.baseUrl}/auth/fetch/token`,
        { withCredentials: true }
      );
      const newToken = response.data;
      localStorage.setItem("token", newToken);
      setToken(newToken);
      return newToken;
    } catch (error) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchTokenWithRetry(retries - 1, delay * 2);
      }
      throw error;
    }
  };

  // Enhanced socket initialization
  const initializeSocket = useCallback(async () => {
    try {
      let currentToken = localStorage.getItem("token");
      
      // Verify and refresh token if needed
      if (!currentToken) {
        currentToken = await fetchTokenWithRetry();
      }

      // Disconnect existing socket if any
      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      // Initialize new socket connection
      socketRef.current = io(API_CONFIG.chatUrl, {
        extraHeaders: {
          Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
      });

      // Socket event handlers
      socketRef.current.on("connect", () => {
        console.log("Socket connected");
        setConnectionStatus('connected');
      });

      socketRef.current.on("disconnect", () => {
        setConnectionStatus('disconnected');
      });

      socketRef.current.on("connect_error", async (err) => {
        console.error("Connection error:", err);
        setConnectionStatus('error');
        
        if (err.message.includes("401")) {
          try {
            const newToken = await fetchTokenWithRetry();
            socketRef.current.auth.token = `Bearer ${newToken}`;
            socketRef.current.connect();
          } catch (error) {
            console.error("Reauthentication failed:", error);
          }
        }
      });

      socketRef.current.on("send-message", (newMessage) => {
        if (!activeChat) return;
        
        const isRelevantMessage = 
          (newMessage.senderId === activeChat.id && newMessage.receiverId === userProfile?.id) ||
          (newMessage.receiverId === activeChat.id && newMessage.senderId === userProfile?.id);
        
        if (isRelevantMessage) {
          setMessages(prev => [...prev, {
            ...newMessage,
            isMe: newMessage.senderId === userProfile?.id,
          }]);
        }
      });

    } catch (error) {
      console.error("Socket initialization failed:", error);
      setConnectionStatus('error');
    }
  }, [activeChat, userProfile?.id]);

  // Enhanced initialization flow
  const initializeApp = useCallback(async () => {
    try {
      setLoading(true);
      
      // 1. Fetch token first
      const token = await fetchTokenWithRetry();
      
      // 2. Fetch profile and users in parallel
      const [profileResponse, usersResponse] = await Promise.all([
        axios.get(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.profile}`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }),
        axios.get(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.allUsers}`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }),
      ]);

      setUserProfile(profileResponse.data.user);
      setUsers(
        usersResponse.data.data.filter(
          (user) => user.id !== profileResponse?.data.user.id
        )
      );

      // 3. Initialize socket connection
      await initializeSocket();

      setLoading(false);
    } catch (error) {
      console.error("Initialization error:", error);
      toast.error("Failed to initialize application");
      if (error.response?.status === 401) {
        // navigate("/login");
      }
      setLoading(false);
    }
  }, [initializeSocket]);

  // Enhanced message fetching
  const fetchMessages = async () => {
    if (!activeChat?.id || !token) return;
console.log(token, activeChat.id)
    try {
      const response = await axios.get(
        `${API_CONFIG.chatUrl}${API_CONFIG.endpoints.messages}/${activeChat?.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );
      
      setMessages(
        response.data.chats.map((chat) => ({
          ...chat,
          isMe: parseInt(chat.senderId) === userProfile?.id,
        }))
      );
    } catch (error) {
      console.error("Error fetching messages:", error);
      if (error.response?.status === 401) {
        try {
          const newToken = await fetchTokenWithRetry();
          setToken(newToken);
          fetchMessages(); // Retry with new token
        } catch (err) {
          toast.error("Session expired. Please refresh the page.");
        }
      } else {
        toast.error("Failed to load messages");
      }
    }
  };

  // Enhanced send message handler
  const handleSendMessage = () => {
    if (!message.trim() || !activeChat || !userProfile || !socketRef.current) {
      return;
    }

    const newMessage = {
      senderId: userProfile.id,
      receiverId: activeChat.id,
      message: message.trim(),
      isMe: true,
      createdAt: new Date().toISOString()
    };

    // Optimistic update
    setMessages(prev => [...prev, newMessage]);
    setMessage("");

    // Send via socket
    socketRef.current.emit("messages", {
      senderId: userProfile.id,
      receiverId: activeChat.id,
      message: message.trim()
    });
  };

  // Initialize app on mount
  useEffect(() => {
    initializeApp();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [initializeApp]);

  // Fetch messages when active chat changes
  useEffect(() => {
    if (token) {
      fetchMessages();
    }
  }, [activeChat?.id, token]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  
   // handle file upload
   const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeChat || !userProfile) return;

    // Validate file size (100MB limit)
    if (file.size > 100 * 1024 * 1024) {
      toast.error("File size exceeds 100MB limit");
      return;
    }

    setFileUploading(true);
    try {
      const formData = new FormData();
      formData.append("files", file);
      formData.append("receiverId", activeChat.id);

      const response = await axios.post(
        `${API_CONFIG.chatUrl}${API_CONFIG.endpoints.upload}`,
        formData,
        {
          withCredentials: true,
        }
      );
      toast.success("File sent successfully");
    } catch (error) {
      console.error("File upload error:", error);
      toast.error("Failed to upload file");
    } finally {
      setFileUploading(false);
      e.target.value = ""; // Reset file input
    }
  };

  const filteredUsers = users.filter((user) =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleLogout = async () => {
    try {
      await axios.get(`${API_CONFIG.baseUrl}/auth/logout`, {
        withCredentials: true,
      });
      await localStorage.removeItem("token");
      navigate("/login");
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Logout failed");
    }
  };

  
  
  const getRandomAvatar = (id) => {
    // Using DiceBear's adorable avatars (cartoon style)
    const avatarStyles = [
      "adventurer",
      "avataaars",
      "bottts",
      "micah",
      "miniavs",
      "open-peeps",
    ];
    
    const style = avatarStyles[id % avatarStyles.length];

    return `https://api.dicebear.com/7.x/${style}/svg?seed=${id}`;
  };
  
  console.log(messages);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile sidebar toggle */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 bg-white p-2 rounded-md shadow-md"
        onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
      >
        <FiMenu className="h-6 w-6 text-gray-600" />
      </button>

      {/* Sidebar */}
      <div
        className={`${sidebarOpen ? "w-64" : "w-20"} 
        ${mobileSidebarOpen ? "block fixed inset-y-0 left-0 z-40" : "hidden"} 
        md:block bg-white border-r border-gray-200 transition-all duration-300`}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            {sidebarOpen ? (
              <div className="flex items-center">
                <FiMessageSquare className="h-6 w-6 text-indigo-600" />
                <span className="ml-2 text-xl font-bold text-gray-800">
                  Chirpy
                </span>
              </div>
            ) : (
              <FiMessageSquare className="h-6 w-6 text-indigo-600 mx-auto" />
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden md:block text-gray-500 hover:text-gray-700"
            >
              <FiMenu className="h-5 w-5" />
            </button>
          </div>

          {/* Search */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={sidebarOpen ? "Search contacts..." : ""}
                className={`w-full pl-10 pr-4 py-2 rounded-lg bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white ${
                  !sidebarOpen ? "opacity-0 w-0" : "opacity-100"
                }`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* New chat button */}
          <div className="p-3">
            <button
              className={`flex items-center justify-center w-full py-2 px-4 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition ${
                !sidebarOpen ? "px-2" : ""
              }`}
            >
              <RiChatNewLine className="h-5 w-5" />
              {sidebarOpen && <span className="ml-2">New Chat</span>}
            </button>
          </div>

          {/* Users list */}
          <div className="flex-1 overflow-y-auto">
            {filteredUsers.map((user, index) => (
              <div
                key={user?.id || index}
                className={`flex items-center p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                  activeChat?.id === user?.id ? "bg-indigo-50" : ""
                }`}
                onClick={() => {
                  setActiveChat(user);
                  setMobileSidebarOpen(false);
                }}
              >
                {user.profileImg ? (
                  <img
                    src={user?.profileImg}
                    referrerPolicy="no-referrer"
                    alt={user?.username || "Profile"}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                    <FiUsers className="h-5 w-5 text-indigo-600" />
                  </div>
                )}
                {sidebarOpen && (
                  <div className="ml-3 flex-1 overflow-hidden">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {user?.username}
                      </h3>
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {user.status || "Hey there! I am using WhatsApp Clone"}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* User profile */}
          <div className="p-3 border-t border-gray-200">
            <div
              className="flex items-center cursor-pointer"
              onClick={() => setShowProfileModal(true)}
            >
              <img
                src={
                  userProfile?.profileImg ||
                  getRandomAvatar(userProfile?.id || 0)
                }
                alt="User"
                className="h-10 w-10 rounded-full object-cover"
              />
              {sidebarOpen && (
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-medium text-gray-900">
                    {userProfile?.username}
                  </h3>
                  <p className="text-xs text-gray-500">Online</p>
                </div>
              )}
              {sidebarOpen && (
                <div className="flex space-x-2">
                  <button className="text-gray-500 hover:text-gray-700">
                    <FiSettings className="h-5 w-5" />
                  </button>
                  <button
                    className="text-gray-500 hover:text-gray-700"
                    // onClick={handleLogout}
                  >
                    <FiLogOut className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeChat ? (
          <>
            {/* Chat header */}
            <div className="bg-white border-b border-gray-200 p-4 flex items-center">
              {activeChat?.profileImg ? (
                <img
                  src={activeChat?.profileImg}
                  alt={activeChat?.username}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                  <FiUsers className="h-5 w-5 text-indigo-600" />
                </div>
              )}
              <div className="ml-3">
                <h2 className="text-lg font-medium text-gray-900">
                  {activeChat?.username}
                </h2>
                <p className="text-xs text-gray-500">Online</p>
              </div>
              <div className="ml-auto flex space-x-2">
                <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full">
                  <FiSearch className="h-5 w-5" />
                </button>
                <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full">
                  <FiSettings className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              <div className="space-y-4">
                {messages?.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      msg.isMe ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-xs md:max-w-md lg:max-w-lg rounded-lg p-3 ${
                        msg?.isMe
                          ? "bg-indigo-600 text-white rounded-br-none"
                          : "bg-white text-gray-800 rounded-bl-none shadow-sm"
                      }`}
                    >
                      {!msg?.isMe && (
                        <div className="flex items-center mb-1">
                          <img
                            src={
                              activeChat?.profileImg ||
                              getRandomAvatar(activeChat.id)
                            }
                            alt={activeChat?.username}
                            className="h-6 w-6 rounded-full mr-2"
                          />
                          <span className="text-xs font-medium">
                            {activeChat.username}
                          </span>
                        </div>
                      )}
                      {msg.uploadFile?.length > 0 ? (
                        <div>
                          {/* Display the message text (if needed) */}
                          <p className="text-sm">{msg?.message}</p>

                          {/* Render each file link */}
                          {msg.uploadFile.map((url, index) => (
                            <a
                              key={index}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`block text-sm underline ${
                                msg.isMe
                                  ? "text-blue-300 hover:text-blue-200"
                                  : "text-blue-600 hover:text-blue-500"
                              }`}
                            >
                              View File {index + 1}
                            </a>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm">{msg?.message}</p>
                      )}
                      <p
                        className={`text-xs mt-1 ${
                          msg.isMe ? "text-indigo-200" : "text-gray-500"
                        }`}
                      >
                        {new Date(
                          msg?.createdAt || Date.now()
                        ).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Message input */}
            <div className="bg-white border-t border-gray-200 p-3">
              <div className="flex items-center">
                <button
                  className="p-2 text-gray-500 hover:text-gray-700 mr-1"
                  onClick={() => fileInputRef.current.click()}
                  disabled={fileUploading}
                >
                  <BsPaperclip className="h-5 w-5" />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="*"
                />
                <input
                  type="text"
                  placeholder="Type a message..."
                  className="flex-1 border border-gray-300 rounded-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  disabled={fileUploading}
                />
                <button
                  className="ml-2 p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition"
                  onClick={handleSendMessage}
                  disabled={fileUploading || !message.trim()}
                >
                  <IoMdSend className="h-5 w-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center p-6 max-w-md">
              <FiMessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No conversation selected
              </h3>
              <p className="text-gray-500 mb-4">
                Select a contact from the sidebar to start chatting
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Profile Modal */}
      {showProfileModal && userProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Your Profile</h2>
              <button
                onClick={() => setShowProfileModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                &times;
              </button>
            </div>
            <div className="flex flex-col items-center mb-4">
              <img
                src={userProfile?.profileImg || getRandomAvatar(userProfile.id)}
                alt="Profile"
                className="h-24 w-24 rounded-full object-cover mb-3"
              />
              <h3 className="text-lg font-medium">{userProfile.username}</h3>
              <p className="text-gray-600">{userProfile.email}</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className="text-green-500">Online</span>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowProfileModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatApp;
