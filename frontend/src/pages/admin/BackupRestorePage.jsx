import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { toast } from 'sonner';
import api from '../../lib/api';
import { 
  Database, 
  Download, 
  Upload, 
  AlertTriangle, 
  Shield, 
  Clock,
  FileJson,
  CheckCircle,
  XCircle,
  Loader2,
  History,
  Lock
} from 'lucide-react';

const BackupRestorePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [backupInfo, setBackupInfo] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreFile, setRestoreFile] = useState(null);
  const [restoreFileData, setRestoreFileData] = useState(null);
  const [confirmText, setConfirmText] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [restoreHistory, setRestoreHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetchBackupInfo();
    fetchRestoreHistory();
  }, []);

  const fetchBackupInfo = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/backup/info');
      setBackupInfo(response.data);
    } catch (error) {
      console.error('Error fetching backup info:', error);
      if (error.response?.status === 403) {
        toast.error('Access Denied: Super Admin privileges required');
        navigate('/admin/dashboard');
      } else {
        toast.error('Failed to load backup information');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchRestoreHistory = async () => {
    try {
      const response = await api.get('/admin/backup/restore-history');
      setRestoreHistory(response.data.history || []);
    } catch (error) {
      console.error('Error fetching restore history:', error);
    }
  };

  const handleExportBackup = async () => {
    try {
      setExporting(true);
      toast.info('Preparing backup file...');
      
      const response = await api.get('/admin/backup/export', {
        responseType: 'blob'
      });
      
      // Create download link
      const blob = new Blob([response.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from header or generate one
      const contentDisposition = response.headers['content-disposition'];
      let filename = `suitsindia_backup_${new Date().toISOString().split('T')[0]}.json`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename=(.+)/);
        if (match) filename = match[1];
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Backup downloaded successfully!');
    } catch (error) {
      console.error('Error exporting backup:', error);
      toast.error('Failed to export backup');
    } finally {
      setExporting(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.name.endsWith('.json')) {
      toast.error('Please select a valid JSON backup file');
      return;
    }
    
    setRestoreFile(file);
    
    // Read file content
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.metadata || !data.collections) {
          toast.error('Invalid backup file format');
          setRestoreFile(null);
          return;
        }
        setRestoreFileData(data);
      } catch (err) {
        toast.error('Failed to parse backup file');
        setRestoreFile(null);
      }
    };
    reader.readAsText(file);
  };

  const handleRestore = async () => {
    if (confirmText !== 'RESTORE') {
      toast.error('Please type RESTORE exactly to confirm');
      return;
    }
    
    if (!adminPassword) {
      toast.error('Please enter your admin password');
      return;
    }
    
    if (!restoreFileData) {
      toast.error('Please select a valid backup file');
      return;
    }
    
    try {
      setRestoring(true);
      
      const response = await api.post('/admin/backup/restore', {
        backup_data: JSON.stringify(restoreFileData),
        confirmation_text: confirmText,
        admin_password: adminPassword
      });
      
      toast.success('Database restored successfully!');
      setShowRestoreModal(false);
      setRestoreFile(null);
      setRestoreFileData(null);
      setConfirmText('');
      setAdminPassword('');
      
      // Refresh backup info
      fetchBackupInfo();
      fetchRestoreHistory();
      
    } catch (error) {
      console.error('Error restoring backup:', error);
      toast.error(error.response?.data?.detail || 'Failed to restore backup');
    } finally {
      setRestoring(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <AdminLayout>
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Database className="h-6 w-6 text-amber-500" />
            Backup & Restore
          </h1>
          <p className="text-slate-400 mt-1">
            Manage database backups and restore points
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowHistory(!showHistory)}
            className="border-slate-600 text-slate-300"
          >
            <History className="h-4 w-4 mr-2" />
            History
          </Button>
        </div>
      </div>

      {/* Warning Banner */}
      <Alert className="bg-amber-500/10 border-amber-500/50">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <AlertDescription className="text-amber-200">
          <strong>Super Admin Access Only.</strong> This is a critical system function. 
          Use backups before major updates and restores only for disaster recovery.
        </AlertDescription>
      </Alert>

      {/* Database Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400">Database</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-slate-100">{backupInfo?.database_name}</p>
            <p className="text-sm text-slate-400">{backupInfo?.environment}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400">Collections</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-slate-100">{backupInfo?.total_collections}</p>
            <p className="text-sm text-slate-400">Business-critical</p>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400">Total Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-slate-100">{backupInfo?.total_documents?.toLocaleString()}</p>
            <p className="text-sm text-slate-400">Records</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Backup */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center gap-2">
              <Download className="h-5 w-5 text-green-500" />
              Export Backup
            </CardTitle>
            <CardDescription className="text-slate-400">
              Download a complete backup of all business data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-slate-900/50 rounded-lg p-4 space-y-2 max-h-48 overflow-y-auto">
              <p className="text-sm text-slate-400 font-medium">Collections included:</p>
              {backupInfo?.collections?.map((coll) => (
                <div key={coll.name} className="flex justify-between text-sm">
                  <span className="text-slate-300">{coll.name}</span>
                  <span className="text-slate-500">{coll.document_count} docs</span>
                </div>
              ))}
            </div>
            <Button
              onClick={handleExportBackup}
              disabled={exporting}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {exporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Preparing Backup...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download Backup
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Restore Backup */}
        <Card className="bg-slate-800 border-slate-700 border-red-500/30">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center gap-2">
              <Upload className="h-5 w-5 text-red-500" />
              Restore from Backup
            </CardTitle>
            <CardDescription className="text-slate-400">
              Replace all data with a previous backup snapshot
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-red-500/10 border-red-500/50">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-red-200 text-sm">
                <strong>WARNING:</strong> Restore will permanently delete ALL existing data 
                and replace it with backup contents. This cannot be undone.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <Label className="text-slate-300">Select Backup File</Label>
              <Input
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="bg-slate-900 border-slate-600 text-slate-300 file:bg-slate-700 file:text-slate-300 file:border-0"
              />
            </div>
            
            {restoreFileData && (
              <div className="bg-slate-900/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-green-400">
                  <FileJson className="h-4 w-4" />
                  <span className="font-medium">Valid backup file</span>
                </div>
                <div className="text-sm text-slate-400 space-y-1">
                  <p>Date: {formatDate(restoreFileData.metadata?.backup_date)}</p>
                  <p>Collections: {restoreFileData.metadata?.total_collections}</p>
                  <p>Documents: {restoreFileData.metadata?.total_documents?.toLocaleString()}</p>
                  <p>Created by: {restoreFileData.metadata?.created_by}</p>
                </div>
              </div>
            )}
            
            <Button
              onClick={() => setShowRestoreModal(true)}
              disabled={!restoreFileData}
              variant="destructive"
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              Start Restore Process
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Restore History */}
      {showHistory && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center gap-2">
              <History className="h-5 w-5 text-amber-500" />
              Restore History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {restoreHistory.length === 0 ? (
              <p className="text-slate-400 text-center py-4">No restore operations recorded</p>
            ) : (
              <div className="space-y-3">
                {restoreHistory.map((entry, index) => (
                  <div key={index} className="bg-slate-900/50 rounded-lg p-4 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        {entry.status === 'completed' ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : entry.status === 'failed' ? (
                          <XCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <Loader2 className="h-4 w-4 text-amber-500 animate-spin" />
                        )}
                        <span className="font-medium text-slate-200">
                          {entry.status === 'completed' ? 'Restore Completed' : 
                           entry.status === 'failed' ? 'Restore Failed' : 'In Progress'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 mt-1">
                        By: {entry.admin_email} | Backup from: {formatDate(entry.backup_date)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDate(entry.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Excluded Collections Info */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Excluded from Backup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">
            Security and audit logs are excluded: {backupInfo?.excluded_collections?.join(', ')}
          </p>
        </CardContent>
      </Card>

      {/* Restore Confirmation Modal */}
      {showRestoreModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <Card className="bg-slate-800 border-red-500 max-w-md w-full">
            <CardHeader className="border-b border-slate-700">
              <CardTitle className="text-red-400 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Confirm Database Restore
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <Alert className="bg-red-500/20 border-red-500">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <AlertDescription className="text-red-200">
                  This will <strong>permanently delete ALL existing production data</strong> and 
                  replace it with the backup contents. This action cannot be undone.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <Label className="text-slate-300">
                  Type <span className="font-mono text-red-400">RESTORE</span> to confirm
                </Label>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Type RESTORE"
                  className="bg-slate-900 border-slate-600 text-slate-100 font-mono"
                  data-testid="restore-confirm-input"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-slate-300 flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Re-enter Admin Password
                </Label>
                <Input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Your admin password"
                  className="bg-slate-900 border-slate-600 text-slate-100"
                  data-testid="restore-password-input"
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRestoreModal(false);
                    setConfirmText('');
                    setAdminPassword('');
                  }}
                  className="flex-1 border-slate-600"
                  disabled={restoring}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleRestore}
                  disabled={confirmText !== 'RESTORE' || !adminPassword || restoring}
                  className="flex-1"
                  data-testid="restore-execute-btn"
                >
                  {restoring ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Restoring...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Execute Restore
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
    </AdminLayout>
  );
};

export default BackupRestorePage;
