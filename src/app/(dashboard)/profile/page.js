import React from 'react'
import { ProfileContent } from '../../../components/admin/profile/ProfileContent'

export default function ProfilePage() {
  return (
    <div className="flex w-full min-h-screen bg-gray-50">
      
      <div className="flex-1">
        <ProfileContent />
      </div>
    </div>
  )
}
