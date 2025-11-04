import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Users, Shield, TrendingUp, Database, FileText, Eye, Download, Search, Filter, FileSignature, Upload } from 'lucide-react'
import './AdminPortal.css'

function AdminPortal({ user }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState(null)
  const [userData, setUserData] = useState(null)
  const [loadingUserData, setLoadingUserData] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [activeTab, setActiveTab] = useState('users') // 'users', 'data', or 'contracts'
  
  // Contract states
  const [contracts, setContracts] = useState([])
  const [loadingContracts, setLoadingContracts] = useState(false)
  const [selectedContract, setSelectedContract] = useState(null)
  const [signature, setSignature] = useState('')
  const [uploadingContract, setUploadingContract] = useState(false)
  const [contractFile, setContractFile] = useState(null)

  useEffect(() => {
    fetchUsers()
    if (activeTab === 'contracts') {
      fetchContracts()
    }
  }, [activeTab])
  
  const fetchContracts = async () => {
    setLoadingContracts(true)
    try {
      const response = await axios.get('/api/admin/contracts')
      if (response.data.status === 'success') {
        setContracts(response.data.contracts)
      }
    } catch (err) {
      console.error('Failed to fetch contracts:', err)
    } finally {
      setLoadingContracts(false)
    }
  }
  
  const handleSignContract = async (contractId) => {
    if (!contractFile || !signature.trim()) {
      alert('Please provide signature and upload signed PDF')
      return
    }
    
    setUploadingContract(true)
    try {
      const formData = new FormData()
      formData.append('contract_id', contractId)
      formData.append('signature', signature)
      formData.append('file', contractFile)
      
      const response = await axios.post('/api/admin/contract/sign', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      if (response.data.status === 'success') {
        alert('Contract signed successfully!')
        setSelectedContract(null)
        setSignature('')
        setContractFile(null)
        fetchContracts()
      }
    } catch (err) {
      alert('Failed to sign contract: ' + (err.response?.data?.detail || err.message))
    } finally {
      setUploadingContract(false)
    }
  }
  
  const handleUpdateContract = async (contractId) => {
    if (!contractFile) {
      alert('Please upload signed PDF')
      return
    }
    
    setUploadingContract(true)
    try {
      const formData = new FormData()
      formData.append('contract_id', contractId)
      formData.append('file', contractFile)
      
      const response = await axios.post('/api/admin/contract/update', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      if (response.data.status === 'success') {
        alert('Contract updated successfully!')
        setSelectedContract(null)
        setContractFile(null)
        fetchContracts()
      }
    } catch (err) {
      alert('Failed to update contract: ' + (err.response?.data?.detail || err.message))
    } finally {
      setUploadingContract(false)
    }
  }
  
  const downloadContract = async (contractId, type = 'template') => {
    try {
      const response = await fetch(`/api/contract/${contractId}/download?type=${type}`)
      if (!response.ok) throw new Error('Failed to download')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Contract_${contractId}_${type}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert('Failed to download contract')
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/auth/users')
      if (response.data.status === 'success') {
        setUsers(response.data.users)
      }
    } catch (err) {
      console.error('Failed to fetch users:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserData = async (userId) => {
    setLoadingUserData(true)
    try {
      const response = await axios.get(`/api/admin/user-data/${userId}`)
      if (response.data.status === 'success') {
        const data = response.data.data
        // Format analyses data - combine personal and company analyses into a single array
        const allAnalyses = [
          ...(data.analyses?.personal || []).map(a => ({ ...a, type: 'personal' })),
          ...(data.analyses?.company || []).map(a => ({ ...a, type: 'company' }))
        ]
        
        setUserData({
          user: data.user,
          uploads: data.uploads || [],
          analyses: allAnalyses
        })
        setSelectedUser(userId)
        // Switch to data tab
        setActiveTab('data')
      }
    } catch (err) {
      console.error('Failed to fetch user data:', err)
      alert('Failed to fetch user data: ' + (err.response?.data?.detail || err.message))
      // Still set selected user so we can show error message
      setSelectedUser(userId)
      setActiveTab('data')
    } finally {
      setLoadingUserData(false)
    }
  }

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.full_name && u.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesFilter = filterType === 'all' || u.account_type === filterType
    
    return matchesSearch && matchesFilter
  })

  if (!user?.is_admin) {
    return (
      <div className="admin-portal">
        <div className="card">
          <h2>Access Denied</h2>
          <p>You need admin privileges to access this portal.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-portal">
      <div className="container">
        <div className="admin-header">
          <h1 className="admin-title">
            <Shield size={42} className="admin-title-icon" />
            Admin Portal
          </h1>
          <p className="admin-subtitle">Manage all users, data uploads, and analysis results</p>
        </div>

        <div className="admin-stats">
          <div className="stat-card">
            <Users size={36} className="stat-icon" />
            <div>
              <h3>{users.length}</h3>
              <p>Total Users</p>
            </div>
          </div>
          <div className="stat-card">
            <TrendingUp size={36} className="stat-icon" />
            <div>
              <h3>{users.filter(u => u.account_type === 'personal').length}</h3>
              <p>Personal Accounts</p>
            </div>
          </div>
          <div className="stat-card">
            <Shield size={36} className="stat-icon" />
            <div>
              <h3>{users.filter(u => u.account_type === 'company').length}</h3>
              <p>Company Accounts</p>
            </div>
          </div>
          <div className="stat-card">
            <Database size={36} className="stat-icon" />
            <div>
              <h3>{userData?.uploads?.length || 0}</h3>
              <p>Total Uploads</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="admin-tabs">
          <button 
            className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <Users size={20} />
            Users Management
          </button>
          <button 
            className={`admin-tab ${activeTab === 'data' ? 'active' : ''}`}
            onClick={() => setActiveTab('data')}
          >
            <Database size={20} />
            Data Management
          </button>
          <button 
            className={`admin-tab ${activeTab === 'contracts' ? 'active' : ''}`}
            onClick={() => setActiveTab('contracts')}
          >
            <FileSignature size={20} />
            Contracts
          </button>
        </div>

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="card admin-users-card">
            <div className="admin-card-header">
              <h2 className="section-title">
                <Users size={24} />
                All Users
              </h2>
              <div className="admin-filters">
                <div className="search-box">
                  <Search size={18} />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="filter-box">
                  <Filter size={18} />
                  <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                    <option value="all">All Types</option>
                    <option value="personal">Personal</option>
                    <option value="company">Company</option>
                  </select>
                </div>
              </div>
            </div>
            
            {loading ? (
              <div className="loading">Loading users...</div>
            ) : (
              <div className="table-wrapper">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Account Type</th>
                      <th>Status</th>
                      <th>Created At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="no-data">
                          No users found matching your criteria
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map(u => (
                        <tr key={u.id} className={selectedUser === u.id ? 'selected' : ''}>
                          <td>{u.full_name || 'N/A'}</td>
                          <td>{u.username}</td>
                          <td>{u.email}</td>
                          <td>
                            <span className={`type-badge ${u.account_type}`}>
                              {u.account_type}
                            </span>
                          </td>
                          <td>
                            <span className={`status-badge ${u.is_verified ? 'verified' : 'unverified'}`}>
                              {u.is_verified ? 'Verified' : 'Unverified'}
                            </span>
                          </td>
                          <td>{new Date(u.created_at).toLocaleDateString()}</td>
                          <td>
                            <button 
                              className="action-btn view-btn"
                              onClick={() => fetchUserData(u.id)}
                              title="View user data"
                            >
                              <Eye size={16} />
                              View Data
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Data Management Tab */}
        {activeTab === 'data' && (
          <div className="card admin-data-card">
            <div className="admin-card-header">
              <h2 className="section-title">
                <Database size={24} />
                User Data & Uploads
              </h2>
            </div>
            
            {selectedUser ? (
              <div className="user-data-view">
                {loadingUserData ? (
                  <div className="loading">Loading user data...</div>
                ) : (
                  <div className="data-content">
                    <div className="data-section">
                      <h3>
                        <FileText size={20} />
                        User Information
                      </h3>
                      {userData?.user ? (
                        <div className="user-info-display" style={{ 
                          padding: '20px', 
                          background: '#1a1a1a', 
                          borderRadius: '12px', 
                          marginBottom: '20px',
                          border: '1px solid #3a3a3a'
                        }}>
                          <p><strong>Name:</strong> {userData.user.full_name || 'N/A'}</p>
                          <p><strong>Username:</strong> {userData.user.username}</p>
                          <p><strong>Email:</strong> {userData.user.email}</p>
                          <p><strong>Account Type:</strong> {userData.user.account_type || 'N/A'}</p>
                          <p><strong>Status:</strong> {userData.user.is_verified ? 'Verified' : 'Unverified'}</p>
                          <p><strong>Created:</strong> {new Date(userData.user.created_at).toLocaleString()}</p>
                        </div>
                      ) : null}
                      <h3 style={{ marginTop: '20px' }}>
                        <FileText size={20} />
                        Upload History
                      </h3>
                      {userData?.uploads && userData.uploads.length > 0 ? (
                        <div className="uploads-list">
                          {userData.uploads.map((upload, idx) => (
                            <div key={idx} className="upload-item">
                              <FileText size={20} />
                              <div className="upload-info">
                                <strong>{upload.filename || 'Unknown File'}</strong>
                                <span>{upload.date || 'No date'}</span>
                              </div>
                              <button className="action-btn download-btn">
                                <Download size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="no-data-box">
                          <FileText size={48} />
                          <p>No uploads found for this user</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="data-section">
                      <h3>
                        <TrendingUp size={20} />
                        Analysis Results
                      </h3>
                      {userData?.analyses && userData.analyses.length > 0 ? (
                        <div className="analyses-list">
                          {userData.analyses.map((analysis, idx) => (
                            <div key={analysis.id || idx} className="analysis-item">
                              <TrendingUp size={20} />
                              <div className="analysis-info">
                                <strong>Analysis {analysis.type === 'company' ? '(Company)' : '(Personal)'} - {idx + 1}</strong>
                                <span>Score: {analysis.smart_score?.score?.toFixed(1) || 'N/A'}/10</span>
                                <span style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                                  {new Date(analysis.created_at || analysis.requested_at).toLocaleString()}
                                </span>
                              </div>
                              <button 
                                className="action-btn view-btn"
                                onClick={() => {
                                  if (analysis.type === 'company') {
                                    window.open(`/api/company/report/${analysis.id}`, '_blank')
                                  } else {
                                    // Handle personal analysis report if needed
                                    alert('Personal analysis reports coming soon')
                                  }
                                }}
                              >
                                <Eye size={16} />
                                View
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="no-data-box">
                          <TrendingUp size={48} />
                          <p>No analysis results found for this user</p>
                        </div>
                      )}
                    </div>
                    
                    <button 
                      className="btn btn-secondary back-btn"
                      onClick={() => {
                        setSelectedUser(null)
                        setUserData(null)
                      }}
                    >
                      ← Back to Users
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="select-user-prompt">
                <Database size={64} />
                <h3>Select a user to view their data</h3>
                <p>Click "View Data" on any user in the Users Management tab to see their uploads and analysis results</p>
              </div>
            )}
          </div>
        )}

        {/* Contracts Tab */}
        {activeTab === 'contracts' && (
          <div className="card admin-contracts-card">
            <div className="admin-card-header">
              <h2 className="section-title">
                <FileSignature size={24} />
                Contract Management
              </h2>
            </div>
            
            {loadingContracts ? (
              <div className="loading">Loading contracts...</div>
            ) : contracts.length === 0 ? (
              <div className="select-user-prompt">
                <FileSignature size={64} />
                <h3>No contracts found</h3>
                <p>Companies can request contracts from their portal</p>
              </div>
            ) : (
              <div className="contracts-list">
                <div className="table-wrapper">
                  <table className="users-table">
                    <thead>
                      <tr>
                        <th>Company</th>
                        <th>Contract ID</th>
                        <th>Status</th>
                        <th>Requested</th>
                        <th>Admin Signed</th>
                        <th>Company Signed</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contracts.map(contract => (
                        <tr key={contract.id} className={selectedContract?.id === contract.id ? 'selected' : ''}>
                          <td>{contract.company_name}</td>
                          <td>{contract.id}</td>
                          <td>
                            <span className={`status-badge ${
                              contract.status === 'active' ? 'verified' :
                              contract.status === 'signed_admin' ? 'unverified' : 'unverified'
                            }`}>
                              {contract.status === 'pending' ? 'Pending' :
                               contract.status === 'signed_admin' ? 'Admin Signed' :
                               contract.status === 'active' ? 'Active' : contract.status}
                            </span>
                          </td>
                          <td>{new Date(contract.requested_at).toLocaleString()}</td>
                          <td>{contract.signed_admin_at ? new Date(contract.signed_admin_at).toLocaleString() : '-'}</td>
                          <td>{contract.signed_company_at ? new Date(contract.signed_company_at).toLocaleString() : '-'}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '5px' }}>
                              <button
                                className="action-btn view-btn"
                                onClick={() => {
                                  setSelectedContract(contract)
                                  setSignature('')
                                  setContractFile(null)
                                }}
                                title="View/Sign contract"
                              >
                                <FileSignature size={16} />
                                {contract.status === 'pending' ? 'Sign' : 'Update'}
                              </button>
                              <button
                                className="action-btn download-btn"
                                onClick={() => downloadContract(contract.id, 'template')}
                                title="Download template"
                              >
                                <Download size={16} />
                              </button>
                              {contract.signed_contract_pdf_path && (
                                <button
                                  className="action-btn download-btn"
                                  onClick={() => downloadContract(contract.id, 'signed')}
                                  title="Download signed"
                                >
                                  <FileText size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {selectedContract && (
                  <div className="contract-sign-form" style={{ marginTop: '30px', padding: '20px', background: '#f8fafc', borderRadius: '8px' }}>
                    <h3 style={{ marginBottom: '20px' }}>Sign Contract: {selectedContract.company_name}</h3>
                    
                    <div style={{ marginBottom: '15px' }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                        Your Signature:
                      </label>
                      <input
                        type="text"
                        value={signature}
                        onChange={(e) => setSignature(e.target.value)}
                        placeholder="Enter your name/title"
                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                    
                    <div style={{ marginBottom: '15px' }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                        Upload Signed PDF:
                      </label>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => setContractFile(e.target.files[0])}
                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                    
                    <div style={{ display: 'flex', gap: '10px' }}>
                      {selectedContract.status === 'pending' ? (
                        <button
                          onClick={() => handleSignContract(selectedContract.id)}
                          disabled={uploadingContract || !signature.trim() || !contractFile}
                          className="btn btn-primary"
                          style={{ padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                        >
                          <Upload size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                          Sign & Upload
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdateContract(selectedContract.id)}
                          disabled={uploadingContract || !contractFile}
                          className="btn btn-primary"
                          style={{ padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                        >
                          <Upload size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                          Update Contract
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedContract(null)
                          setSignature('')
                          setContractFile(null)
                        }}
                        className="btn btn-secondary"
                        style={{ padding: '10px 20px', background: '#64748b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminPortal

