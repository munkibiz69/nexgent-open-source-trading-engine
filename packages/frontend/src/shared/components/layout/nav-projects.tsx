"use client"

import * as React from "react"
import { cn } from "@/shared/utils/cn"
import { SidebarGroup } from "../ui/sidebar"

interface NavProjectsProps {
  projects: {
    name: string
    url: string
    icon: React.ComponentType<{ className?: string }>
  }[]
  title?: string
}

export function NavProjects({ projects }: NavProjectsProps) {
  return (
    <SidebarGroup>
      {projects.map((project) => {
        const Icon = project.icon
        return (
          <a
            key={project.name}
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent",
              "text-muted-foreground hover:text-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{project.name}</span>
          </a>
        )
      })}
    </SidebarGroup>
  )
}

