/**
 * Wallet feature types
 * 
 * Type definitions specific to the wallets feature module.
 */

/**
 * Props for wallet deposit dialog
 */
export interface WalletDepositDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: string;
  currentBalance: number;
  solPrice: number;
  walletType?: 'simulation' | 'live';
  walletAddress?: string;
  onSuccess?: () => void;
}

/**
 * Props for wallet assign dialog
 */
export interface WalletAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: string;
  onSuccess?: () => void;
}

/**
 * Props for wallet reset dialog
 */
export interface WalletResetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: string;
  walletAddress: string;
  walletType?: 'simulation' | 'live';
  onSuccess?: () => void;
}

/**
 * Props for wallet unassign dialog
 */
export interface WalletUnassignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: string;
  walletAddress: string;
  onSuccess?: () => void;
}


