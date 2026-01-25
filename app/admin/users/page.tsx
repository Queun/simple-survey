'use client'

import { useEffect, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UserPlus, Pencil, Trash2, Shield, User } from 'lucide-react'

interface User {
  id: number
  username: string
  role: 'ADMIN' | 'PRINCIPAL'
  schoolId: number | null
  school: {
    id: number
    name: string
    code: string
  } | null
  createdAt: string
}

interface School {
  id: number
  name: string
  code: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'PRINCIPAL' as 'ADMIN' | 'PRINCIPAL',
    schoolId: ''
  })

  useEffect(() => {
    fetchUsers()
    fetchSchools()
  }, [])

  async function fetchUsers() {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!res.ok) {
        throw new Error('Failed to fetch users')
      }

      const data = await res.json()
      setUsers(data)
    } catch (err) {
      console.error('Error fetching users:', err)
      setError('加载用户列表失败')
    } finally {
      setLoading(false)
    }
  }

  async function fetchSchools() {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/admin/schools', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!res.ok) {
        throw new Error('Failed to fetch schools')
      }

      const data = await res.json()
      setSchools(data)
    } catch (err) {
      console.error('Error fetching schools:', err)
    }
  }

  function resetForm() {
    setFormData({
      username: '',
      password: '',
      role: 'PRINCIPAL',
      schoolId: ''
    })
    setEditingUser(null)
    setShowForm(false)
  }

  function handleEdit(user: User) {
    setEditingUser(user)
    setFormData({
      username: user.username,
      password: '',
      role: user.role,
      schoolId: user.schoolId ? String(user.schoolId) : ''
    })
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    try {
      const token = localStorage.getItem('token')

      const payload: any = {
        username: formData.username,
        role: formData.role,
        schoolId: formData.schoolId ? parseInt(formData.schoolId, 10) : null
      }

      // 只有在创建新用户或修改密码时才发送密码
      if (!editingUser || formData.password) {
        if (!formData.password) {
          setError('密码不能为空')
          return
        }
        payload.password = formData.password
      }

      const url = editingUser
        ? `/api/admin/users/${editingUser.id}`
        : '/api/admin/users'

      const method = editingUser ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Operation failed')
      }

      await fetchUsers()
      resetForm()
    } catch (err: any) {
      console.error('Error saving user:', err)
      setError(err.message || '操作失败')
    }
  }

  async function handleDelete(userId: number) {
    if (!confirm('确定要删除该用户吗？')) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!res.ok) {
        const result = await res.json()
        throw new Error(result.error || 'Delete failed')
      }

      await fetchUsers()
    } catch (err: any) {
      console.error('Error deleting user:', err)
      alert(err.message || '删除失败')
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-gray-500">加载中...</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">用户管理</h1>
            <p className="text-gray-600 mt-1">管理系统用户和权限</p>
          </div>
          {!showForm && (
            <Button onClick={() => setShowForm(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              添加用户
            </Button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>{editingUser ? '编辑用户' : '创建新用户'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="username">用户名 *</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="password">
                      密码 {editingUser ? '(留空表示不修改)' : '*'}
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required={!editingUser}
                    />
                  </div>

                  <div>
                    <Label htmlFor="role">角色 *</Label>
                    <select
                      id="role"
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as 'ADMIN' | 'PRINCIPAL' })}
                      required
                    >
                      <option value="ADMIN">管理员 (ADMIN)</option>
                      <option value="PRINCIPAL">校长 (PRINCIPAL)</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="schoolId">
                      绑定学校 {formData.role === 'PRINCIPAL' && '*'}
                    </Label>
                    <select
                      id="schoolId"
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      value={formData.schoolId}
                      onChange={(e) => setFormData({ ...formData, schoolId: e.target.value })}
                      required={formData.role === 'PRINCIPAL'}
                    >
                      <option value="">-- 不绑定学校 --</option>
                      {schools.map(school => (
                        <option key={school.id} value={school.id}>
                          {school.name} ({school.code})
                        </option>
                      ))}
                    </select>
                    {formData.role === 'PRINCIPAL' && (
                      <p className="text-sm text-gray-500 mt-1">校长账号必须绑定学校</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="submit">
                    {editingUser ? '保存' : '创建'}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    取消
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>用户列表</CardTitle>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <p className="text-center text-gray-500 py-8">暂无用户</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">ID</th>
                      <th className="text-left py-3 px-4">用户名</th>
                      <th className="text-left py-3 px-4">角色</th>
                      <th className="text-left py-3 px-4">绑定学校</th>
                      <th className="text-left py-3 px-4">创建时间</th>
                      <th className="text-left py-3 px-4">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">{user.id}</td>
                        <td className="py-3 px-4 font-medium">{user.username}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.role === 'ADMIN'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {user.role === 'ADMIN' ? (
                              <><Shield className="mr-1 h-3 w-3" />管理员</>
                            ) : (
                              <><User className="mr-1 h-3 w-3" />校长</>
                            )}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {user.school ? (
                            <span>{user.school.name}</span>
                          ) : (
                            <span className="text-gray-400">未绑定</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {new Date(user.createdAt).toLocaleString('zh-CN')}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(user)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(user.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
