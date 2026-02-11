'use client';

import * as React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog';
import { Button } from '@/shared/components/ui/button';
import { useToast } from '@/shared/hooks/use-toast';

/** Form registration: sections report dirty state and expose a save function. */
export interface RegisteredForm {
  isDirty: () => boolean;
  save: () => Promise<boolean>;
}

interface UnsavedChangesContextValue {
  hasUnsavedChanges: boolean;
  registerForm: (id: string, form: RegisteredForm) => void;
  unregisterForm: (id: string) => void;
  updateFormDirty: (id: string, dirty: boolean) => void;
  /** Call before navigating. Shows modal if dirty; runs action after save/discard. */
  promptBeforeNavigate: (action: () => void | Promise<void>) => Promise<void>;
}

const UnsavedChangesContext = React.createContext<UnsavedChangesContextValue | null>(null);

export function useUnsavedChanges() {
  return React.useContext(UnsavedChangesContext);
}

interface UnsavedChangesProviderProps {
  children: React.ReactNode;
}

export function UnsavedChangesProvider({ children }: UnsavedChangesProviderProps) {
  const { toast } = useToast();
  const formsRef = React.useRef<Map<string, RegisteredForm>>(new Map());
  const dirtyStateRef = React.useRef<Map<string, boolean>>(new Map());
  const [, setTick] = React.useState(0);
  const forceUpdate = React.useCallback(() => setTick((t) => t + 1), []);

  const [modalState, setModalState] = React.useState<{
    open: boolean;
    saveInProgress: boolean;
  }>({ open: false, saveInProgress: false });
  const pendingActionRef = React.useRef<(() => void | Promise<void>) | null>(null);

  const hasUnsavedChanges = Array.from(dirtyStateRef.current.values()).some(Boolean);

  const registerForm = React.useCallback((id: string, form: RegisteredForm) => {
    formsRef.current.set(id, form);
    dirtyStateRef.current.set(id, form.isDirty());
    forceUpdate();
  }, [forceUpdate]);

  const unregisterForm = React.useCallback((id: string) => {
    formsRef.current.delete(id);
    dirtyStateRef.current.delete(id);
    forceUpdate();
  }, [forceUpdate]);

  const updateFormDirty = React.useCallback((id: string, dirty: boolean) => {
    const prev = dirtyStateRef.current.get(id);
    if (prev !== dirty) {
      dirtyStateRef.current.set(id, dirty);
      forceUpdate();
    }
  }, [forceUpdate]);

  const promptBeforeNavigate = React.useCallback(
    async (action: () => void | Promise<void>) => {
      if (!hasUnsavedChanges) {
        await action();
        return;
      }
      pendingActionRef.current = action;
      setModalState({ open: true, saveInProgress: false });
    },
    [hasUnsavedChanges]
  );

  const runSaveAndThenAction = React.useCallback(async () => {
    setModalState((s) => ({ ...s, saveInProgress: true }));
    const forms = Array.from(formsRef.current.values());
    const dirtyForms = forms.filter((f) => f.isDirty());
    let allOk = true;
    for (const form of dirtyForms) {
      const ok = await form.save();
      if (!ok) allOk = false;
    }
    const pending = pendingActionRef.current;
    if (allOk && pending) {
      pendingActionRef.current = null;
      setModalState({ open: false, saveInProgress: false });
      await pending();
      for (const [id, form] of formsRef.current) {
        if (!form.isDirty()) dirtyStateRef.current.set(id, false);
      }
    } else {
      setModalState((s) => ({ ...s, saveInProgress: false }));
      if (!allOk) {
        toast({
          variant: 'destructive',
          title: 'Save Failed',
          description: 'Could not save changes. Please fix any errors and try again.',
        });
      }
    }
  }, [toast]);

  const runDiscardAndThenAction = React.useCallback(async () => {
    const pending = pendingActionRef.current;
    pendingActionRef.current = null;
    setModalState({ open: false, saveInProgress: false });
    if (pending) await pending();
    for (const id of dirtyStateRef.current.keys()) {
      dirtyStateRef.current.set(id, false);
    }
  }, []);

  const cancelModal = React.useCallback(() => {
    pendingActionRef.current = null;
    setModalState({ open: false, saveInProgress: false });
  }, []);

  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const value = React.useMemo<UnsavedChangesContextValue>(
    () => ({
      hasUnsavedChanges,
      registerForm,
      unregisterForm,
      updateFormDirty,
      promptBeforeNavigate,
    }),
    [hasUnsavedChanges, registerForm, unregisterForm, updateFormDirty, promptBeforeNavigate]
  );

  const hasDirtyForms =
    modalState.open && Array.from(formsRef.current.values()).some((f) => f.isDirty());
  const canSave = hasDirtyForms && !modalState.saveInProgress;

  return (
    <UnsavedChangesContext.Provider value={value}>
      {children}
      <AlertDialog open={modalState.open} onOpenChange={(open) => !open && cancelModal()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes to your agent configuration. Do you want to save them before
              leaving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelModal}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => runDiscardAndThenAction()}
              disabled={modalState.saveInProgress}
            >
              Discard changes
            </Button>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                runSaveAndThenAction();
              }}
              disabled={!canSave}
            >
              {modalState.saveInProgress ? 'Saving...' : 'Save'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </UnsavedChangesContext.Provider>
  );
}
