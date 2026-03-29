import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import {
  MessageCircle,
  Send,
  Paperclip,
  Search,
  Users,
  Package,
  FileText,
  Download,
  Loader2,
  Plus,
  User,
  Clock
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

// Message Bubble Component (same as ChatWidget)
const MessageBubble = ({ message, isOwn }) => {
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
      <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
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

const AdminChatsPage = () => {
  const { token, user } = useAuth();
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newMessage, setNewMessage] = useState('');
  
  // New chat modal state
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [resellers, setResellers] = useState([]);
  const [selectedReseller, setSelectedReseller] = useState('');
  const [resellerOrders, setResellerOrders] = useState([]);
  const [loadingResellers, setLoadingResellers] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const pollIntervalRef = useRef(null);
  
  // Initial fetch
  useEffect(() => {
    fetchChats();
    
    // Polling every 5 seconds
    pollIntervalRef.current = setInterval(() => {
      fetchChats();
      if (selectedChat) {
        fetchMessages(selectedChat.id);
      }
    }, 5000);
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const fetchChats = async () => {
    try {
      const response = await axios.get(`${API_URL}/chats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChats(response.data);
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setLoading(false);
    }
  };
  
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
      
      fetchChats();  // Refresh to update unread counts
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setMessagesLoading(false);
    }
  };
  
  const handleSelectChat = (chat) => {
    setSelectedChat(chat);
    fetchMessages(chat.id);
  };
  
  const handleSendMessage = async () => {
    if (!selectedChat || !newMessage.trim()) return;
    
    try {
      setSending(true);
      await axios.post(
        `${API_URL}/chats/${selectedChat.id}/messages`,
        { content: newMessage, message_type: 'text' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewMessage('');
      fetchMessages(selectedChat.id);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedChat) return;
    
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File too large (max 2MB). Please share a download link instead.');
      return;
    }
    
    try {
      setSending(true);
      
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadResponse = await axios.post(
        `${API_URL}/chats/${selectedChat.id}/upload`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
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
      e.target.value = '';
    }
  };
  
  // New Chat Modal Functions
  const fetchResellers = async () => {
    try {
      setLoadingResellers(true);
      const response = await axios.get(`${API_URL}/admin/chats/resellers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResellers(response.data);
    } catch (error) {
      console.error('Error fetching resellers:', error);
    } finally {
      setLoadingResellers(false);
    }
  };
  
  const fetchResellerOrders = async (resellerEmail) => {
    try {
      setLoadingOrders(true);
      const response = await axios.get(`${API_URL}/admin/chats/reseller/${resellerEmail}/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResellerOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoadingOrders(false);
    }
  };
  
  const handleOpenNewChat = () => {
    setShowNewChatModal(true);
    setSelectedReseller('');
    setResellerOrders([]);
    fetchResellers();
  };
  
  const handleResellerChange = (email) => {
    setSelectedReseller(email);
    fetchResellerOrders(email);
  };
  
  const handleCreateChat = async (orderId) => {
    try {
      const response = await axios.get(`${API_URL}/chats/order/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setShowNewChatModal(false);
      setSelectedChat(response.data);
      fetchMessages(response.data.id);
      fetchChats();
    } catch (error) {
      console.error('Error creating chat:', error);
      toast.error(error.response?.data?.detail || 'Failed to create chat');
    }
  };
  
  // Filter chats
  const filteredChats = chats.filter(chat => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      chat.order_display?.toLowerCase().includes(term) ||
      chat.customer_name?.toLowerCase().includes(term) ||
      chat.reseller_name?.toLowerCase().includes(term)
    );
  });
  
  return (
    <AdminLayout>
      <div className="h-[calc(100vh-120px)] flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <MessageCircle className="h-8 w-8 text-[#c9a962]" />
            <div>
              <h1 className="text-3xl font-bold text-[#1a1a1a]">Order Chats</h1>
              <p className="text-[#666]">Communicate with resellers about orders</p>
            </div>
          </div>
          <Button 
            onClick={handleOpenNewChat}
            className="bg-[#c9a962] hover:bg-[#b89952] text-black"
            data-testid="new-chat-btn"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>
        
        <div className="flex-1 flex gap-6 overflow-hidden">
          {/* Chat List */}
          <Card className="w-80 flex flex-col">
            <CardHeader className="pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search chats..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full">
                <div className="p-3 space-y-2">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-[#c9a962]" />
                    </div>
                  ) : filteredChats.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <MessageCircle className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No chats found</p>
                    </div>
                  ) : (
                    filteredChats.map((chat) => (
                      <div
                        key={chat.id}
                        onClick={() => handleSelectChat(chat)}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedChat?.id === chat.id 
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
                            <p className="text-xs text-blue-600 truncate">{chat.reseller_name}</p>
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
            </CardContent>
          </Card>
          
          {/* Chat Messages */}
          <Card className="flex-1 flex flex-col overflow-hidden">
            {selectedChat ? (
              <>
                {/* Chat Header */}
                <CardHeader className="pb-3 border-b bg-[#1a2744] text-white rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-white">{selectedChat.order_display}</CardTitle>
                      <CardDescription className="text-white/70">
                        {selectedChat.customer_name} • {selectedChat.reseller_name}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedChat.sales_partner_name && (
                        <Badge className="bg-green-500/20 text-green-300">
                          Partner: {selectedChat.sales_partner_name}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                {/* Participants Info */}
                <div className="px-4 py-2 bg-gray-50 border-b text-xs flex flex-wrap gap-2">
                  <span className="text-gray-500">Participants:</span>
                  <span className="text-blue-600">{selectedChat.reseller_name || 'Reseller'}</span>
                  {selectedChat.sales_partner_name && (
                    <>
                      <span className="text-gray-400">•</span>
                      <span className="text-green-600">{selectedChat.sales_partner_name}</span>
                    </>
                  )}
                  <span className="text-gray-400">•</span>
                  <span className="text-purple-600">Factory (Admin)</span>
                </div>
                
                {/* Messages */}
                <CardContent className="flex-1 overflow-hidden p-0">
                  <ScrollArea className="h-full p-4">
                    {messagesLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin text-[#c9a962]" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        <div className="text-center">
                          <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>No messages yet</p>
                          <p className="text-sm">Start the conversation!</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {messages.map((msg) => (
                          <MessageBubble 
                            key={msg.id} 
                            message={msg}
                            isOwn={msg.sender_email === user?.email}
                          />
                        ))}
                        <div ref={messagesEndRef} />
                      </>
                    )}
                  </ScrollArea>
                </CardContent>
                
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
                      onClick={handleSendMessage}
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
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Select a chat</h3>
                  <p className="text-sm">Choose a conversation from the list or start a new one</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
      
      {/* New Chat Modal */}
      <Dialog open={showNewChatModal} onOpenChange={setShowNewChatModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-[#c9a962]" />
              New Chat
            </DialogTitle>
            <DialogDescription>
              Select a reseller and order to start a conversation
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Reseller Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Reseller</label>
              {loadingResellers ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-[#c9a962]" />
                </div>
              ) : (
                <Select value={selectedReseller} onValueChange={handleResellerChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a reseller..." />
                  </SelectTrigger>
                  <SelectContent>
                    {resellers.map((r) => (
                      <SelectItem key={r.email} value={r.email}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          {r.name} {r.company && `(${r.company})`}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            
            {/* Order Selection */}
            {selectedReseller && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Order</label>
                {loadingOrders ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-[#c9a962]" />
                  </div>
                ) : resellerOrders.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No orders found</p>
                  </div>
                ) : (
                  <ScrollArea className="h-48">
                    <div className="space-y-2 pr-4">
                      {resellerOrders.map((order) => (
                        <div
                          key={order.order_id}
                          onClick={() => handleCreateChat(order.order_id)}
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
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminChatsPage;
