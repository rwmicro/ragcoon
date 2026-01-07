"use client"

import { useQuery } from "@tanstack/react-query"
import { SidebarProjectItem } from "./sidebar-project-item"

type Project = {
  id: string
  name: string
  user_id: string
  created_at: string
}

export function SidebarProject() {

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const response = await fetch("/api/projects")
      if (!response.ok) {
        throw new Error("Failed to fetch projects")
      }
      const data = await response.json()
      // Handle case where API returns an error object instead of an array
      if (data.error || !Array.isArray(data)) {
        return []
      }
      return data
    },
  })

  return (
    <div className="mb-5">
      {isLoading ? null : (
        <div className="space-y-1">
          {Array.isArray(projects) && projects.map((project) => (
            <SidebarProjectItem key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  )
}
