import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  Database, 
  Download, 
  Upload, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle,
  FileJson,
  Server,
  HardDrive
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const DatabaseSyncPage = () => {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/admin/database/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Failed to load database stats');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const response = await axios.get(`${API_URL}/admin/database/export`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from header or generate one
      const contentDisposition = response.headers['content-disposition'];
      let filename = `suitsindia_backup_${new Date().toISOString().split('T')[0]}.json`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename=(.+)/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Database exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export database');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast.error('Please select a JSON file');
      return;
    }

    // Confirm before import
    if (!window.confirm(
      '⚠️ WARNING: This will REPLACE all existing data with the uploaded backup.\n\n' +
      'This action cannot be undone. Are you sure you want to continue?'
    )) {
      event.target.value = '';
      return;
    }

    try {
      setImporting(true);
      setImportResults(null);
      
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${API_URL}/admin/database/import`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setImportResults(response.data);
      
      if (response.data.success) {
        toast.success('Database imported successfully!');
        fetchStats(); // Refresh stats
      } else {
        toast.warning('Import completed with some errors');
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error(error.response?.data?.detail || 'Failed to import database');
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6" data-testid="database-sync-page">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Database className="h-6 w-6" />
              Database Sync
            </h1>
            <p className="text-gray-500 mt-1">
              Export and import database for syncing between environments
            </p>
          </div>
          <Button variant="outline" onClick={fetchStats} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Warning Banner */}
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-amber-800">Important Notes</h3>
                <ul className="text-sm text-amber-700 mt-1 list-disc list-inside space-y-1">
                  <li>Export from preview environment and import to production to sync data</li>
                  <li>Import will <strong>replace all existing data</strong> - create a backup first!</li>
                  <li>User passwords are preserved during sync</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Export/Import Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Export Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5 text-blue-600" />
                Export Database
              </CardTitle>
              <CardDescription>
                Download current database as a JSON backup file
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-blue-700 text-sm">
                  <FileJson className="h-4 w-4" />
                  <span>Creates a complete backup of all collections</span>
                </div>
              </div>
              <Button 
                onClick={handleExport} 
                disabled={exporting}
                className="w-full bg-blue-600 hover:bg-blue-700"
                data-testid="export-database-btn"
              >
                {exporting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Exporting...
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

          {/* Import Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-green-600" />
                Import Database
              </CardTitle>
              <CardDescription>
                Upload a JSON backup file to restore/sync data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-red-700 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  <span>This will replace ALL existing data!</span>
                </div>
              </div>
              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  disabled={importing}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  data-testid="import-database-input"
                />
                <Button 
                  variant="outline"
                  disabled={importing}
                  className="w-full border-green-300 text-green-700 hover:bg-green-50"
                >
                  {importing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Select Backup File
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Import Results */}
        {importResults && (
          <Card className={importResults.success ? 'border-green-200' : 'border-red-200'}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {importResults.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                )}
                Import Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(importResults.imported_collections || {}).map(([name, count]) => (
                    <div key={name} className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-sm text-gray-500">{name}</div>
                      <div className="text-lg font-semibold">{count} docs</div>
                    </div>
                  ))}
                </div>
                {importResults.errors?.length > 0 && (
                  <div className="bg-red-50 p-4 rounded-lg">
                    <h4 className="font-medium text-red-800 mb-2">Errors:</h4>
                    <ul className="text-sm text-red-700 list-disc list-inside">
                      {importResults.errors.map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Database Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Current Database Stats
            </CardTitle>
            <CardDescription>
              {stats?.database_name && `Database: ${stats.database_name}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : stats ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <HardDrive className="h-8 w-8 text-gray-400" />
                  <div>
                    <div className="text-2xl font-bold">{stats.total_documents?.toLocaleString()}</div>
                    <div className="text-sm text-gray-500">Total Documents</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(stats.collections || {})
                    .sort((a, b) => b[1] - a[1])
                    .map(([name, count]) => (
                    <div key={name} className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-sm text-gray-500 truncate" title={name}>{name}</div>
                      <div className="text-lg font-semibold">{count}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Failed to load stats
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>How to Sync Preview → Production</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-3 text-gray-700">
              <li>
                <strong>In Preview Environment:</strong> Click "Download Backup" to export the database
              </li>
              <li>
                <strong>In Production Environment:</strong> Go to Admin → Database Sync
              </li>
              <li>
                <strong>Upload:</strong> Click "Select Backup File" and choose the downloaded JSON file
              </li>
              <li>
                <strong>Confirm:</strong> The import will replace all data - make sure you want to do this!
              </li>
              <li>
                <strong>Verify:</strong> Check that your data appears correctly after import
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default DatabaseSyncPage;
