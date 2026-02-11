"use client"

import * as React from "react"
import { usePathname } from 'next/navigation'
import {
  BookOpen,
  Bot,
  Settings2,
  SquareTerminal,
  History,
  Code,
} from "lucide-react"
import { Button } from "../ui/button"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "../ui/sidebar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip"
import { AgentSwitcher } from "@/features/agents"
import { NavMain } from "./nav-main"
import { NavProjects } from "./nav-projects"
import { NavUser } from "./nav-user"
import { useIsMobile } from "@/shared/hooks/use-mobile"
import { AGENT_UPDATED_EVENT } from "@/shared/constants"
import { useUser } from "@/shared/contexts/user.context"
import { useAgents } from "@/features/agents"
import { config } from "@/shared/config/app.config"
import { theme } from "@/shared/config/theme.config"
import { CreateAgentDialog } from "@/features/agents"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: {
    email: string
  }
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const pathname = usePathname()
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false)
  const isMobile = useIsMobile()
  const { user: contextUser } = useUser()

  // Fetch user's agents to check if they have any
  const { data: agents = [], isLoading: isLoadingAgents } = useAgents(contextUser?.id)

  // Listen for agent updates to refresh the data
  React.useEffect(() => {
    const handleAgentUpdate = () => {
      // React Query will automatically refetch when the event is triggered
    }

    window.addEventListener(AGENT_UPDATED_EVENT, handleAgentUpdate)
    return () => {
      window.removeEventListener(AGENT_UPDATED_EVENT, handleAgentUpdate)
    }
  }, [])

  // Navigation data with dynamic active states
  const data = {
    navMain: [
      {
        title: "Agent activity",
        url: "#",
        icon: SquareTerminal,
        isActive: pathname.startsWith('/dashboard'),
        items: [
          {
            title: "Performance overview",
            url: "/dashboard/performance-overview",
            isActive: pathname === '/dashboard/performance-overview',
          },
          {
            title: "Trading signals",
            url: "/dashboard/trade-signals",
            isActive: pathname === '/dashboard/trade-signals',
          },
          {
            title: "Transaction history",
            url: "/dashboard/transactions",
            isActive: pathname.startsWith('/dashboard/transactions'),
          },
        ],
      },
      {
        title: "Agent configuration",
        url: "#",
        icon: Bot,
        isActive: pathname.startsWith('/dashboard/agent') || pathname.startsWith('/dashboard/signals') || pathname.startsWith('/dashboard/wallet'),
        items: [
          {
            title: "Profile & strategy",
            url: "/dashboard/agent-profile",
            isActive: pathname.startsWith('/dashboard/agent-profile') || pathname.startsWith('/dashboard/signals'),
          },
          {
            title: "Wallet",
            url: "/dashboard/wallet",
            isActive: pathname === '/dashboard/wallet',
          },
        ],
      },
      {
        title: "Settings",
        url: "#",
        icon: Settings2,
        isActive: pathname.startsWith('/dashboard/integrations') || pathname.startsWith('/dashboard/general'),
        items: [
          {
            title: "General",
            url: "/dashboard/general",
            isActive: pathname.startsWith('/dashboard/general')
          },
          {
            title: "Integrations",
            url: "/dashboard/integrations",
            isActive: pathname.startsWith('/dashboard/integrations')
          },
        ],
      },
    ],
    projects: [
      {
        name: "Platform documentation",
        url: config.urls.docs.platform,
        icon: BookOpen,
      },
      {
        name: "API documentation",
        url: config.urls.docs.api,
        icon: Code,
      },
      {
        name: "Changelog",
        url: config.urls.docs.changelog,
        icon: History,
      },
    ],
  }

  return (
    <Sidebar
      {...props}
      className={`${props.className || ""} ${isMobile ? "bg-background dark:bg-zinc-900" : ""}`.trim()}
      style={isMobile ? { backgroundColor: theme.colors.background.mobileSidebar } : undefined}
    >
      <div className={`flex h-full w-full flex-col${isMobile ? " bg-background dark:bg-zinc-900" : ""}`}>
        <SidebarHeader>
          <AgentSwitcher />
        </SidebarHeader>
        <SidebarContent>
          <div className="px-4 mb-2 mt-4">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-full">
                    <Button 
                      id="create-agent-button"
                      variant="outline"
                      size="sm"
                      className="bg-background hover:bg-muted dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-white w-full border-border dark:border-zinc-700"
                      onClick={() => setCreateDialogOpen(true)}
                      disabled={isLoadingAgents}
                    >
                      <Bot className="h-4 w-4 mr-1" style={{ color: theme.colors.accent.primary }} />
                      Create new agent
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Create new agent</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <NavMain items={data.navMain} />
          <NavProjects projects={data.projects} title="Resources" />
        </SidebarContent>
        <SidebarFooter>
          <NavUser user={user} />
        </SidebarFooter>
        <CreateAgentDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />
      </div>
    </Sidebar>
  )
}
