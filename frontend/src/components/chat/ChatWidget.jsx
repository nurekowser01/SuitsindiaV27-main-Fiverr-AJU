import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import {
  MessageCircle,
  X,
  Send,
  Paperclip,
  ChevronLeft,
  Image as ImageIcon,
  FileText,
  Download,
  Loader2,
  Users,
  Package,
  User
} from 'lucide-react';

// Helper to handle 401 errors and clear invalid tokens
const handle401Error = (error) => {
  if (error.response?.status === 401) {
    const detail = error.response?.data?.detail || '';
    if (detail.includes('Invalid token') || detail.includes('Token expired') || detail.includes('Could not validate')) {
      console.warn('🔐 Chat: Token invalid, clearing session...');
      localStorage.removeItem('admin_token');
      localStorage.removeItem('reseller_token');
      localStorage.removeItem('partner_token');
      // Let the main app handle redirect
    }
  }
  throw error;
};

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

// Chat List Component
const ChatList = ({ chats, onSelectChat, selectedChatId, onNewChat, userRole }) => {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-lg">Chats</h3>
        <p className="text-sm text-gray-500">Select an order to chat</p>
      </div>
      
      <div className="p-3">
        <Button 
          onClick={onNewChat}
          className="w-full bg-[#c9a962] hover:bg-[#b89952] text-black"
          data-testid="new-chat-btn"
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {chats.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No chats yet</p>
              <p className="text-sm">Start a new chat about an order</p>
            </div>
          ) : (
            chats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => onSelectChat(chat)}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedChatId === chat.id 
                    ? 'bg-[#c9a962]/20 border border-[#c9a962]' 
                    : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                }`}
                data-testid={`chat-item-${chat.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{chat.order_display}</span>
                      {chat.unread_count > 0 && (
                        <Badge className="bg-red-500 text-white text-xs px-1.5">
                          {chat.unread_count}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{chat.customer_name}</p>
                    {userRole === 'admin' && (
                      <p className="text-xs text-blue-600 truncate">{chat.reseller_name}</p>
                    )}
                    {chat.last_message && (
                      <p className="text-xs text-gray-400 truncate mt-1">
                        {chat.last_message.sender_name}: {chat.last_message.content}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

// Message Bubble Component
const MessageBubble = ({ message, isOwn, currentUserEmail }) => {
  const isFile = message.message_type === 'file' || message.message_type === 'image';
  const isImage = message.message_type === 'image' || 
    (message.file_name && /\.(jpg|jpeg|png|gif|webp)$/i.test(message.file_name));
  
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };
  
  const getRoleBadge = (role) => {
    const roleConfig = {
      admin: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Factory' },
      reseller: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Reseller' },
      sales_partner: { bg: 'bg-green-100', text: 'text-green-700', label: 'Partner' },
    };
    const config = roleConfig[role] || { bg: 'bg-gray-100', text: 'text-gray-700', label: role };
    return (
      <span className={`text-xs px-1.5 py-0.5 rounded ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };
  
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[80%] ${isOwn ? 'items-end' : 'items-start'}`}>
        {!isOwn && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-gray-700">{message.sender_name}</span>
            {getRoleBadge(message.sender_role)}
          </div>
        )}
        <div
          className={`rounded-2xl px-4 py-2 ${
            isOwn 
              ? 'bg-[#1a2744] text-white rounded-br-md' 
              : 'bg-gray-100 text-gray-800 rounded-bl-md'
          }`}
        >
          {isFile ? (
            <div className="flex items-center gap-3">
              {isImage ? (
                <a 
                  href={`${API_URL}${message.file_url}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block"
                >
                  <img 
                    src={`${API_URL}${message.file_url}`}
                    alt={message.file_name}
                    className="max-w-[200px] max-h-[200px] rounded-lg object-cover"
                  />
                </a>
              ) : (
                <a 
                  href={`${API_URL}${message.file_url}`}
                  download={message.file_name}
                  className={`flex items-center gap-2 ${isOwn ? 'text-white' : 'text-gray-800'}`}
                >
                  <FileText className="h-8 w-8 opacity-70" />
                  <div>
                    <p className="text-sm font-medium">{message.file_name}</p>
                    <p className="text-xs opacity-70">{formatFileSize(message.file_size)}</p>
                  </div>
                  <Download className="h-4 w-4" />
                </a>
              )}
            </div>
          ) : (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          )}
        </div>
        <p className={`text-xs text-gray-400 mt-1 ${isOwn ? 'text-right' : 'text-left'}`}>
          {message.created_at ? new Date(message.created_at).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          }) : ''}
        </p>
      </div>
    </div>
  );
};

// Chat Messages Component
const ChatMessages = ({ chat, messages, onBack, onSendMessage, onUploadFile, loading, sending }) => {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const { user } = useAuth();
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSend = () => {
    if (!newMessage.trim()) return;
    onSendMessage(newMessage);
    setNewMessage('');
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File too large (max 2MB). Please share a download link instead.');
      return;
    }
    
    await onUploadFile(file);
    e.target.value = '';
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-[#1a2744] text-white flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="text-white hover:bg-white/10">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h3 className="font-semibold">{chat.order_display}</h3>
          <p className="text-xs text-white/70">{chat.customer_name}</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-white/70">
          <Users className="h-4 w-4" />
          <span>{chat.participants?.length || 1} participants</span>
        </div>
      </div>
      
      {/* Participants Info */}
      <div className="px-4 py-2 bg-gray-50 border-b text-xs flex flex-wrap gap-2">
        <span className="text-gray-500">Participants:</span>
        <span className="text-blue-600">{chat.reseller_name || 'Reseller'}</span>
        {chat.sales_partner_name && (
          <>
            <span className="text-gray-400">•</span>
            <span className="text-green-600">{chat.sales_partner_name}</span>
          </>
        )}
        <span className="text-gray-400">•</span>
        <span className="text-purple-600">Factory (Admin)</span>
      </div>
      
      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-[#c9a962]" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No messages yet</p>
            <p className="text-sm">Start the conversation!</p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble 
                key={msg.id} 
                message={msg}
                isOwn={msg.sender_email === user?.email}
                currentUserEmail={user?.email}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </ScrollArea>
      
      {/* Input */}
      <div className="p-4 border-t bg-white">
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
            className="text-gray-500 hover:text-[#c9a962]"
            title="Attach file (max 2MB)"
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            disabled={sending}
            className="flex-1"
            data-testid="chat-message-input"
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className="bg-[#c9a962] hover:bg-[#b89952] text-black"
            data-testid="send-message-btn"
          >
            {sending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-400 mt-1">Max file size: 2MB. For larger files, share a download link.</p>
      </div>
    </div>
  );
};

// New Chat Modal (Order Selection)
const NewChatModal = ({ isOpen, onClose, onSelectOrder, userRole, token }) => {
  const [orders, setOrders] = useState([]);
  const [resellers, setResellers] = useState([]);
  const [selectedReseller, setSelectedReseller] = useState('');
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      if (userRole === 'admin') {
        fetchResellers();
      } else if (userRole === 'sales_partner') {
        fetchReferredResellers();
      } else {
        fetchOrders();
      }
    }
  }, [isOpen, userRole]);
  
  const fetchResellers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/admin/chats/resellers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResellers(response.data);
    } catch (error) {
      console.error('Error fetching resellers:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchReferredResellers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/sales-partner/chats/resellers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResellers(response.data);
    } catch (error) {
      console.error('Error fetching resellers:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchOrders = async (resellerEmail = null) => {
    try {
      setLoading(true);
      let url = `${API_URL}/orders`;
      if (userRole === 'admin' && resellerEmail) {
        url = `${API_URL}/admin/chats/reseller/${resellerEmail}/orders`;
      }
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleResellerChange = (email) => {
    setSelectedReseller(email);
    fetchOrders(email);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-[#c9a962]" />
            New Chat
          </DialogTitle>
          <DialogDescription>
            Select an order to start a conversation
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Reseller Selection for Admin/Partner */}
          {(userRole === 'admin' || userRole === 'sales_partner') && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Reseller</label>
              <Select value={selectedReseller} onValueChange={handleResellerChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a reseller..." />
                </SelectTrigger>
                <SelectContent>
                  {resellers.map((r) => (
                    <SelectItem key={r.email} value={r.email}>
                      {r.name} {r.company && `(${r.company})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Order List */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Order</label>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[#c9a962]" />
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  {(userRole === 'admin' || userRole === 'sales_partner') && !selectedReseller 
                    ? 'Select a reseller first'
                    : 'No orders found'}
                </p>
              </div>
            ) : (
              <ScrollArea className="h-60">
                <div className="space-y-2 pr-4">
                  {orders.map((order) => (
                    <div
                      key={order.order_id}
                      onClick={() => onSelectOrder(order.order_id)}
                      className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                      data-testid={`select-order-${order.order_id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{order.order_id}</p>
                          <p className="text-xs text-gray-500">{order.customer_name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {order.status}
                          </Badge>
                          {order.has_chat && (
                            <Badge className="bg-blue-100 text-blue-700 text-xs">
                              Has Chat
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Main Chat Widget Component
const ChatWidget = ({ userRole = 'reseller' }) => {
  const { token, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [pollingInterval, setPollingInterval] = useState(5000); // Default 5 seconds
  
  const pollIntervalRef = useRef(null);
  
  // Fetch chat settings (polling interval)
  const fetchChatSettings = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/chat-settings/public`);
      const intervalSeconds = response.data.polling_interval_seconds || 5;
      setPollingInterval(intervalSeconds * 1000); // Convert to milliseconds
    } catch (error) {
      console.error('Error fetching chat settings:', error);
      // Keep default 5 seconds
    }
  };
  
  // Fetch chats
  const fetchChats = async () => {
    try {
      const response = await axios.get(`${API_URL}/chats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChats(response.data);
    } catch (error) {
      if (error.response?.status === 401) {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        return;
      }
      console.error('Error fetching chats:', error);
    }
  };
  
  // Fetch unread count
  const fetchUnreadCount = async () => {
    try {
      const response = await axios.get(`${API_URL}/chats/unread-count`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnreadCount(response.data.unread_count);
    } catch (error) {
      if (error.response?.status === 401) {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        return;
      }
      console.error('Error fetching unread count:', error);
    }
  };
  
  // Fetch messages for selected chat
  const fetchMessages = async (chatId) => {
    try {
      setMessagesLoading(true);
      const response = await axios.get(`${API_URL}/chats/${chatId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(response.data);
      
      // Mark as read
      await axios.patch(`${API_URL}/chats/${chatId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Refresh unread count
      fetchUnreadCount();
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setMessagesLoading(false);
    }
  };
  
  // Initialize and polling
  useEffect(() => {
    if (token) {
      fetchChatSettings(); // Fetch configurable polling interval
      fetchChats();
      fetchUnreadCount();
    }
  }, [token]);
  
  // Set up polling with configurable interval
  useEffect(() => {
    if (token && pollingInterval) {
      // Clear existing interval
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      
      // Polling with configurable interval
      pollIntervalRef.current = setInterval(() => {
        fetchUnreadCount();
        if (isOpen) {
          fetchChats();
          if (selectedChat) {
            fetchMessages(selectedChat.id);
          }
        }
      }, pollingInterval);
      
      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
      };
    }
  }, [token, isOpen, selectedChat?.id, pollingInterval]);
  
  // Handle chat selection
  const handleSelectChat = (chat) => {
    setSelectedChat(chat);
    fetchMessages(chat.id);
  };
  
  // Handle new chat creation
  const handleNewChat = async (orderId) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/chats/order/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSelectedChat(response.data);
      fetchMessages(response.data.id);
      setShowNewChatModal(false);
      fetchChats();
    } catch (error) {
      console.error('Error creating chat:', error);
      toast.error(error.response?.data?.detail || 'Failed to create chat');
    } finally {
      setLoading(false);
    }
  };
  
  // Send message
  const handleSendMessage = async (content) => {
    if (!selectedChat) return;
    
    try {
      setSending(true);
      await axios.post(
        `${API_URL}/chats/${selectedChat.id}/messages`,
        { content, message_type: 'text' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchMessages(selectedChat.id);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };
  
  // Upload file
  const handleUploadFile = async (file) => {
    if (!selectedChat) return;
    
    try {
      setSending(true);
      
      // Upload file
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadResponse = await axios.post(
        `${API_URL}/chats/${selectedChat.id}/upload`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Send file message
      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name);
      await axios.post(
        `${API_URL}/chats/${selectedChat.id}/messages`,
        {
          content: `Sent a file: ${file.name}`,
          message_type: isImage ? 'image' : 'file',
          file_url: uploadResponse.data.file_url,
          file_name: uploadResponse.data.file_name,
          file_size: uploadResponse.data.file_size,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      fetchMessages(selectedChat.id);
      toast.success('File uploaded');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(error.response?.data?.detail || 'Failed to upload file');
    } finally {
      setSending(false);
    }
  };
  
  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-[#1a2744] text-white rounded-full shadow-lg hover:bg-[#2a3754] transition-all z-50 flex items-center justify-center"
        data-testid="chat-widget-btn"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <>
            <MessageCircle className="h-6 w-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </>
        )}
      </button>
      
      {/* Chat Panel */}
      <div
        className={`fixed bottom-24 right-6 w-96 h-[500px] bg-white rounded-2xl shadow-2xl z-50 overflow-hidden transition-all transform ${
          isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'
        }`}
        style={{ maxHeight: 'calc(100vh - 120px)' }}
      >
        {selectedChat ? (
          <ChatMessages
            chat={selectedChat}
            messages={messages}
            onBack={() => setSelectedChat(null)}
            onSendMessage={handleSendMessage}
            onUploadFile={handleUploadFile}
            loading={messagesLoading}
            sending={sending}
          />
        ) : (
          <ChatList
            chats={chats}
            onSelectChat={handleSelectChat}
            selectedChatId={selectedChat?.id}
            onNewChat={() => setShowNewChatModal(true)}
            userRole={userRole}
          />
        )}
      </div>
      
      {/* New Chat Modal */}
      <NewChatModal
        isOpen={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        onSelectOrder={handleNewChat}
        userRole={userRole}
        token={token}
      />
    </>
  );
};

export default ChatWidget;
