"use client"

import * as React from "react"
import { useRouter, usePathname } from "next/navigation"
import { ChevronRight, LucideIcon } from "lucide-react"
import { cn } from "@/shared/utils/cn"
import { useUnsavedChanges } from "@/features/agents/contexts/unsaved-changes.context"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible"
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "../ui/sidebar"

export interface NavItem {
  title: string
  url: string
  badge?: string | React.ReactNode
  isActive?: boolean
  disabled?: boolean
  items?: NavItem[]
}

interface NavMainProps {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    isActive?: boolean
    items?: NavItem[]
  }[]
}

export function NavMain({ items }: NavMainProps) {
  const router = useRouter()
  const pathname = usePathname()
  const unsavedContext = useUnsavedChanges()

  const isAgentProfileWithUnsaved = Boolean(
    pathname?.startsWith('/dashboard/agent-profile') &&
    unsavedContext?.hasUnsavedChanges
  )

  const handleNavClick = React.useCallback(
    (e: React.MouseEvent, href: string) => {
      if (!href.startsWith('/') || href === pathname) return
      if (isAgentProfileWithUnsaved) {
        e.preventDefault()
        unsavedContext?.promptBeforeNavigate(() => router.push(href))
      }
    },
    [pathname, isAgentProfileWithUnsaved, unsavedContext, router]
  )

  return (
    <SidebarGroup>
      {items.map((item) => (
        <Collapsible
          key={item.title}
          asChild
          defaultOpen={true}
          className="group/collapsible"
        >
          <SidebarMenu>
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton tooltip={item.title} className="hover:bg-accent hover:text-accent-foreground">
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                  <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {item.items?.map((subItem) => (
                    <SidebarMenuSubItem key={subItem.title}>
                      <SidebarMenuSubButton
                        asChild
                        className={cn(
                          "hover:bg-accent hover:text-accent-foreground",
                          subItem.disabled && "opacity-50",
                          subItem.isActive && "bg-accent text-accent-foreground font-medium"
                        )}
                      >
                        <a 
                          href={subItem.url} 
                          className={`flex items-center justify-between w-full ${subItem.disabled ? 'pointer-events-none' : ''}`}
                          tabIndex={subItem.disabled ? -1 : undefined}
                          onClick={(e) => handleNavClick(e, subItem.url)}
                        >
                          <span>{subItem.title}</span>
                          {subItem.badge}
                        </a>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </SidebarMenu>
        </Collapsible>
      ))}
    </SidebarGroup>
  )
}

