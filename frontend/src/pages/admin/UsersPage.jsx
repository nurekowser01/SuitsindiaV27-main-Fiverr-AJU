import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Checkbox } from '../../components/ui/checkbox';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Edit, 
  Trash2, 
  Plus, 
  Search,
  CreditCard,
  Building,
  Grid3X3,
  Save,
  LayoutDashboard,
  Package,
  Palette,
  Ruler,
  ShoppingCart,
  FileText,
  Settings,
  Target,
  Bell,
  MessageCircle,
  UserSquare,
  Image,
  Edit3,
  DollarSign,
  Briefcase,
  Mail,
  Globe,
  Database,
  RefreshCw
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

// Define pages for permission matrix — must match AdminLayout sidebar
const PERMISSION_PAGES = [
  { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
  { id: 'orders', name: 'Orders', icon: ShoppingCart },
  { id: 'chats', name: 'Chats', icon: MessageCircle },
  { id: 'customers', name: 'Customers', icon: UserSquare },
  { id: 'ui-manager', name: 'UI Manager', icon: Image },
  { id: 'content-editor', name: 'Content Editor', icon: Edit3 },
  { id: 'products', name: 'Products', icon: Package },
  { id: 'pricing', name: 'Pricing', icon: DollarSign },
  { id: 'styling', name: 'Style Options', icon: Palette },
  { id: 'measurements', name: 'Measurements', icon: Ruler },
  { id: 'pages', name: 'Static Pages', icon: FileText },
  { id: 'users', name: 'Users & Roles', icon: Shield },
  { id: 'sales-partners', name: 'Sales Partners', icon: Briefcase },
  { id: 'stripe', name: 'Stripe', icon: CreditCard },
  { id: 'email', name: 'Email', icon: Mail },
  { id: 'marketing', name: 'Marketing', icon: Target },
  { id: 'seo', name: 'SEO Management', icon: Globe },
  { id: 'settings', name: 'Settings', icon: Settings },
  { id: 'backup', name: 'Backup', icon: Database },
  { id: 'database-sync', name: 'Database Sync', icon: RefreshCw },
];

const ACCESS_LEVELS = [
  { id: 'none', name: 'No View', color: 'bg-red-500' },
  { id: 'view', name: 'View Only', color: 'bg-blue-500' },
  { id: 'edit', name: 'View & Edit', color: 'bg-green-500' },
];

const UsersPage = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  
  // Users state
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newUserForm, setNewUserForm] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    company: '',
    address: '',
    role_id: '',
    payment_methods: {
      bank_transfer: true,
      stripe: false
    },
    reseller_source: 'direct',
    referred_by: '',
    is_active: true
  });
  const [submitting, setSubmitting] = useState(false);

  // Roles state
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [roleForm, setRoleForm] = useState({ name: '', description: '' });

  // Permissions Matrix state
  const [selectedRoleForPermissions, setSelectedRoleForPermissions] = useState('');
  const [permissionsMatrix, setPermissionsMatrix] = useState({});
  const [savingPermissions, setSavingPermissions] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  useEffect(() => {
    // When roles are loaded, select the first one for permissions
    if (roles.length > 0 && !selectedRoleForPermissions) {
      setSelectedRoleForPermissions(roles[0].id);
    }
  }, [roles]);

  useEffect(() => {
    // When selected role changes, load its permissions
    if (selectedRoleForPermissions) {
      const role = roles.find(r => r.id === selectedRoleForPermissions);
      if (role) {
        // Set default permissions if not defined
        const defaultPermissions = {};
        PERMISSION_PAGES.forEach(page => {
          defaultPermissions[page.id] = role.permissions?.pages?.[page.id] || 
            (role.id === 'admin' ? 'edit' : 'none');
        });
        setPermissionsMatrix(defaultPermissions);
      }
    }
  }, [selectedRoleForPermissions, roles]);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await axios.get(`${API_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchRoles = async () => {
    try {
      setLoadingRoles(true);
      const response = await axios.get(`${API_URL}/roles/roles`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRoles(response.data);
    } catch (error) {
      console.error('Error fetching roles:', error);
    } finally {
      setLoadingRoles(false);
    }
  };

  // User handlers
  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUserForm.email || !newUserForm.password) {
      toast.error('Email and password are required');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(
        `${API_URL}/admin/users`,
        newUserForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('User created successfully');
      setAddUserOpen(false);
      resetUserForm();
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setNewUserForm({
      email: user.email || '',
      password: '',
      full_name: user.full_name || '',
      phone: user.phone || '',
      company: user.company || '',
      address: user.address || '',
      role_id: user.role_id || '',
      payment_methods: user.payment_methods || { bank_transfer: true, stripe: false },
      reseller_source: user.reseller_source || 'direct',
      referred_by: user.referred_by || '',
      is_active: user.is_active !== false
    });
    setEditUserOpen(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const updateData = { ...newUserForm };
      if (!updateData.password) delete updateData.password;
      
      await axios.put(
        `${API_URL}/admin/users/${selectedUser.id}`,
        updateData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('User updated successfully');
      setEditUserOpen(false);
      resetUserForm();
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId, email) => {
    if (!confirm(`Delete user ${email}? This cannot be undone.`)) return;

    try {
      await axios.delete(`${API_URL}/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('User deleted');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  const resetUserForm = () => {
    setNewUserForm({
      email: '',
      password: '',
      full_name: '',
      phone: '',
      company: '',
      address: '',
      role_id: '',
      payment_methods: { bank_transfer: true, stripe: false },
      reseller_source: 'direct',
      referred_by: '',
      is_active: true
    });
    setSelectedUser(null);
  };

  // Role handlers
  const handleCreateRole = async (e) => {
    e.preventDefault();
    if (!roleForm.name.trim()) {
      toast.error('Role name is required');
      return;
    }

    try {
      if (editingRole) {
        await axios.put(
          `${API_URL}/roles/roles/${editingRole.id}`,
          roleForm,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Role updated');
      } else {
        await axios.post(
          `${API_URL}/roles/roles`,
          { ...roleForm, permissions: {} },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Role created');
      }
      setRoleDialogOpen(false);
      setEditingRole(null);
      setRoleForm({ name: '', description: '' });
      fetchRoles();
    } catch (error) {
      toast.error('Failed to save role');
    }
  };

  const handleEditRole = (role) => {
    setEditingRole(role);
    setRoleForm({ name: role.name, description: role.description || '' });
    setRoleDialogOpen(true);
  };

  const handleDeleteRole = async (roleId) => {
    if (!confirm('Delete this role?')) return;
    try {
      await axios.delete(`${API_URL}/roles/roles/${roleId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Role deleted');
      fetchRoles();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete role');
    }
  };

  // Permissions Matrix handlers
  const handlePermissionChange = (pageId, accessLevel) => {
    setPermissionsMatrix(prev => ({
      ...prev,
      [pageId]: accessLevel
    }));
  };

  const handleSavePermissions = async () => {
    setSavingPermissions(true);
    try {
      await axios.put(
        `${API_URL}/roles/roles/${selectedRoleForPermissions}`,
        { 
          permissions: { pages: permissionsMatrix }
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Permissions saved successfully');
      fetchRoles();
    } catch (error) {
      toast.error('Failed to save permissions');
    } finally {
      setSavingPermissions(false);
    }
  };

  const filteredUsers = users.filter(user => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      user.email?.toLowerCase().includes(term) ||
      user.full_name?.toLowerCase().includes(term) ||
      user.company?.toLowerCase().includes(term)
    );
  });

  const getRoleName = (roleId) => {
    const role = roles.find(r => r.id === roleId);
    return role?.name || 'No Role';
  };

  const getAccessLevelConfig = (level) => {
    return ACCESS_LEVELS.find(al => al.id === level) || ACCESS_LEVELS[0];
  };

  const renderUserForm = (onSubmit, isEdit = false) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Email *</Label>
          <Input
            type="email"
            placeholder="user@example.com"
            value={newUserForm.email}
            onChange={(e) => setNewUserForm(prev => ({ ...prev, email: e.target.value }))}
            required
            autoComplete="off"
          />
        </div>
        <div>
          <Label>{isEdit ? 'New Password (leave empty to keep)' : 'Password *'}</Label>
          <Input
            type="password"
            placeholder="••••••••"
            value={newUserForm.password}
            onChange={(e) => setNewUserForm(prev => ({ ...prev, password: e.target.value }))}
            required={!isEdit}
            autoComplete="new-password"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Full Name</Label>
          <Input
            placeholder="John Doe"
            value={newUserForm.full_name}
            onChange={(e) => setNewUserForm(prev => ({ ...prev, full_name: e.target.value }))}
            autoComplete="off"
          />
        </div>
        <div>
          <Label>Phone</Label>
          <Input
            placeholder="+91 9876543210"
            value={newUserForm.phone}
            onChange={(e) => setNewUserForm(prev => ({ ...prev, phone: e.target.value }))}
            autoComplete="off"
          />
        </div>
      </div>

      <div>
        <Label>Company</Label>
        <Input
          placeholder="Company Name"
          value={newUserForm.company}
          onChange={(e) => setNewUserForm(prev => ({ ...prev, company: e.target.value }))}
          autoComplete="off"
        />
      </div>

      <div>
        <Label>Address</Label>
        <Textarea
          placeholder="Full address..."
          value={newUserForm.address}
          onChange={(e) => setNewUserForm(prev => ({ ...prev, address: e.target.value }))}
          rows={2}
        />
      </div>

      <div>
        <Label>Role</Label>
        <Select
          value={newUserForm.role_id || 'none'}
          onValueChange={(value) => setNewUserForm(prev => ({ ...prev, role_id: value === 'none' ? '' : value }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select role..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No Role</SelectItem>
            {roles.map((role) => (
              <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Payment Methods - Only show for Reseller role */}
      {(newUserForm.role_id === 'reseller') && (
        <div className="space-y-3">
          <Label>Payment Methods Allowed</Label>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Checkbox
                id={isEdit ? "bank_transfer_edit" : "bank_transfer_add"}
                checked={newUserForm.payment_methods?.bank_transfer}
                onCheckedChange={(checked) => setNewUserForm(prev => ({
                  ...prev,
                  payment_methods: { ...prev.payment_methods, bank_transfer: checked }
                }))}
              />
              <label htmlFor={isEdit ? "bank_transfer_edit" : "bank_transfer_add"} className="text-sm">Bank Transfer</label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id={isEdit ? "stripe_edit" : "stripe_add"}
                checked={newUserForm.payment_methods?.stripe}
                onCheckedChange={(checked) => setNewUserForm(prev => ({
                  ...prev,
                  payment_methods: { ...prev.payment_methods, stripe: checked }
                }))}
              />
              <label htmlFor={isEdit ? "stripe_edit" : "stripe_add"} className="text-sm">Stripe (Online)</label>
            </div>
          </div>
        </div>
      )}

      {/* Reseller Source - Only show for Reseller role */}
      {(newUserForm.role_id === 'reseller') && (
        <div className="space-y-3">
          <Label>Reseller Source</Label>
          <Select
            value={newUserForm.reseller_source || 'direct'}
            onValueChange={(value) => setNewUserForm(prev => ({ ...prev, reseller_source: value, referred_by: value === 'direct' ? '' : prev.referred_by }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select source..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="direct">Direct (approached company directly)</SelectItem>
              <SelectItem value="referred">Referred by Sales Partner</SelectItem>
            </SelectContent>
          </Select>
          
          {newUserForm.reseller_source === 'referred' && (
            <div className="mt-2">
              <Label>Referred By (Sales Partner)</Label>
              <Select
                value={newUserForm.referred_by || ''}
                onValueChange={(value) => setNewUserForm(prev => ({ ...prev, referred_by: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sales partner..." />
                </SelectTrigger>
                <SelectContent>
                  {users.filter(u => u.role_id === 'sales_partner').map((sp) => (
                    <SelectItem key={sp.id} value={sp.email}>{sp.full_name || sp.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Switch
          id={isEdit ? "is_active_edit" : "is_active_add"}
          checked={newUserForm.is_active}
          onCheckedChange={(checked) => setNewUserForm(prev => ({ ...prev, is_active: checked }))}
        />
        <Label htmlFor={isEdit ? "is_active_edit" : "is_active_add"}>Active User</Label>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={() => isEdit ? setEditUserOpen(false) : setAddUserOpen(false)}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : (isEdit ? 'Update User' : 'Create User')}
        </Button>
      </div>
    </form>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <Users className="h-8 w-8" />
          <h1 className="text-3xl font-bold">User Management</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="users" data-testid="tab-users">
              <Users className="h-4 w-4 mr-2" />
              Users & Roles
            </TabsTrigger>
            <TabsTrigger value="roles" data-testid="tab-roles">
              <Shield className="h-4 w-4 mr-2" />
              Manage Roles
            </TabsTrigger>
            <TabsTrigger value="permissions" data-testid="tab-permissions">
              <Grid3X3 className="h-4 w-4 mr-2" />
              Permissions Matrix
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6 mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Users ({users.length})</CardTitle>
                  <CardDescription>Manage user accounts and permissions</CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                      data-testid="search-users"
                    />
                  </div>
                  <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={resetUserForm} data-testid="add-user-btn">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add User
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Add New User</DialogTitle>
                        <DialogDescription>Create a new user account</DialogDescription>
                      </DialogHeader>
                      {renderUserForm(handleAddUser, false)}
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {loadingUsers ? (
                  <div className="text-center py-8">Loading...</div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No users found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                        data-testid={`user-row-${user.id}`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-semibold">{user.full_name || 'No Name'}</h3>
                            {user.is_admin && <Badge variant="destructive">Admin</Badge>}
                            {user.is_active === false && <Badge variant="secondary">Inactive</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            {user.phone && <span>📞 {user.phone}</span>}
                            {user.company && <span><Building className="inline h-3 w-3" /> {user.company}</span>}
                            <span><Shield className="inline h-3 w-3" /> {getRoleName(user.role_id)}</span>
                          </div>
                          {user.payment_methods && (
                            <div className="flex gap-2 mt-2">
                              {user.payment_methods.bank_transfer && <Badge variant="outline" className="text-xs">Bank Transfer</Badge>}
                              {user.payment_methods.stripe && <Badge variant="outline" className="text-xs"><CreditCard className="h-3 w-3 mr-1" />Stripe</Badge>}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEditUser(user)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          {!user.is_admin && (
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteUser(user.id, user.email)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Edit User Dialog */}
            <Dialog open={editUserOpen} onOpenChange={setEditUserOpen}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Edit User</DialogTitle>
                  <DialogDescription>Update user details</DialogDescription>
                </DialogHeader>
                {renderUserForm(handleUpdateUser, true)}
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Roles Tab */}
          <TabsContent value="roles" className="space-y-6 mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Roles</CardTitle>
                  <CardDescription>Create and manage user roles</CardDescription>
                </div>
                <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => { setEditingRole(null); setRoleForm({ name: '', description: '' }); }} data-testid="create-role-btn">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Role
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingRole ? 'Edit Role' : 'Create Role'}</DialogTitle>
                      <DialogDescription>Define a role for your users</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateRole} className="space-y-4">
                      <div>
                        <Label>Role Name *</Label>
                        <Input
                          placeholder="e.g., Sales Partner, Reseller"
                          value={roleForm.name}
                          onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Textarea
                          placeholder="What can this role do?"
                          value={roleForm.description}
                          onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                          rows={3}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setRoleDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit">
                          {editingRole ? 'Update' : 'Create'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {loadingRoles ? (
                  <div className="text-center py-8">Loading...</div>
                ) : roles.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No roles created yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {roles.map((role) => (
                      <div
                        key={role.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                        data-testid={`role-row-${role.id}`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{role.name}</h3>
                            {role.is_system && <Badge variant="secondary" className="text-xs">System</Badge>}
                          </div>
                          {role.description && <p className="text-sm text-muted-foreground">{role.description}</p>}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEditRole(role)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          {!role.is_system && (
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteRole(role.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Permissions Matrix Tab */}
          <TabsContent value="permissions" className="space-y-6 mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Permissions Matrix</CardTitle>
                  <CardDescription>Configure page access levels for each role</CardDescription>
                </div>
                <Button 
                  onClick={handleSavePermissions} 
                  disabled={savingPermissions || !selectedRoleForPermissions}
                  data-testid="save-permissions-btn"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {savingPermissions ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <Label className="mb-2 block">Select Role</Label>
                  <Select
                    value={selectedRoleForPermissions}
                    onValueChange={setSelectedRoleForPermissions}
                  >
                    <SelectTrigger className="w-64" data-testid="role-select">
                      <SelectValue placeholder="Select a role..." />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedRoleForPermissions && (
                  <div className="border rounded-lg overflow-hidden">
                    {/* Table Header */}
                    <div className="grid grid-cols-2 bg-muted/50 px-4 py-3 border-b">
                      <div className="font-medium text-sm">Page</div>
                      <div className="font-medium text-sm text-right">Access Level</div>
                    </div>

                    {/* Table Body */}
                    <div className="divide-y">
                      {PERMISSION_PAGES.map((page) => {
                        const Icon = page.icon;
                        const currentAccess = permissionsMatrix[page.id] || 'none';
                        const accessConfig = getAccessLevelConfig(currentAccess);
                        
                        return (
                          <div 
                            key={page.id} 
                            className="grid grid-cols-2 items-center px-4 py-3 hover:bg-muted/30"
                            data-testid={`permission-row-${page.id}`}
                          >
                            <div className="flex items-center gap-3">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{page.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {roles.find(r => r.id === selectedRoleForPermissions)?.name}
                                </p>
                              </div>
                            </div>
                            <div className="flex justify-end">
                              <Select
                                value={currentAccess}
                                onValueChange={(value) => handlePermissionChange(page.id, value)}
                              >
                                <SelectTrigger className="w-40" data-testid={`access-select-${page.id}`}>
                                  <SelectValue>
                                    <div className="flex items-center gap-2">
                                      <span className={`w-2 h-2 rounded-full ${accessConfig.color}`}></span>
                                      <span>{accessConfig.name}</span>
                                    </div>
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  {ACCESS_LEVELS.map((level) => (
                                    <SelectItem key={level.id} value={level.id}>
                                      <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${level.color}`}></span>
                                        <span>{level.name}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {!selectedRoleForPermissions && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Grid3X3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a role to configure permissions</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default UsersPage;
