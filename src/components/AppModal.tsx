"use client";

import { useState, useEffect, useCallback } from "react";
import { X, AlertTriangle, CheckCircle2 } from "lucide-react";

// --- Modal Component ---

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 max-w-md mx-auto bg-zinc-900 border-t border-zinc-800 rounded-t-[32px] p-6 pb-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
        {title && (
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-white">{title}</h2>
            <button onClick={onClose} className="p-1 text-zinc-500">
              <X size={20} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

// --- Toast Component ---

interface ToastProps {
  message: string;
  type?: "success" | "error";
  open: boolean;
  onClose: () => void;
}

export function Toast({ message, type = "success", open, onClose }: ToastProps) {
  useEffect(() => {
    if (open) {
      const timer = setTimeout(onClose, 2500);
      return () => clearTimeout(timer);
    }
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed top-12 inset-x-0 z-50 flex justify-center animate-in slide-in-from-top duration-300 pointer-events-none">
      <div className={`flex items-center gap-2 px-5 py-3 rounded-2xl shadow-xl border pointer-events-auto ${
        type === "success"
          ? "bg-green-500/10 border-green-500/20 text-green-400"
          : "bg-red-500/10 border-red-500/20 text-red-400"
      }`}>
        {type === "success" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
        <span className="text-sm font-bold">{message}</span>
      </div>
    </div>
  );
}

// --- useConfirm Hook ---

interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  destructive: boolean;
  resolve: ((value: boolean) => void) | null;
}

export function useConfirm() {
  const [state, setState] = useState<ConfirmState>({
    open: false,
    title: "",
    message: "",
    confirmLabel: "Confirm",
    destructive: false,
    resolve: null,
  });

  const confirm = useCallback((options: {
    title: string;
    message: string;
    confirmLabel?: string;
    destructive?: boolean;
  }): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        open: true,
        title: options.title,
        message: options.message,
        confirmLabel: options.confirmLabel || "Confirm",
        destructive: options.destructive ?? false,
        resolve,
      });
    });
  }, []);

  const handleClose = useCallback((result: boolean) => {
    state.resolve?.(result);
    setState(prev => ({ ...prev, open: false, resolve: null }));
  }, [state.resolve]);

  const ConfirmDialog = () => {
    if (!state.open) return null;
    return (
      <Modal open={state.open} onClose={() => handleClose(false)} title={state.title}>
        <p className="text-zinc-400 text-sm mb-8">{state.message}</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleClose(false)}
            className="py-3.5 bg-zinc-800 text-white font-bold rounded-2xl border border-white/5 active:scale-95 transition-transform"
          >
            Cancel
          </button>
          <button
            onClick={() => handleClose(true)}
            className={`py-3.5 font-bold rounded-2xl active:scale-95 transition-transform ${
              state.destructive
                ? "bg-red-500 text-white"
                : "bg-orange-500 text-white"
            }`}
          >
            {state.confirmLabel}
          </button>
        </div>
      </Modal>
    );
  };

  return { confirm, ConfirmDialog };
}

// --- usePrompt Hook ---

interface PromptState {
  open: boolean;
  title: string;
  placeholder: string;
  submitLabel: string;
  resolve: ((value: string | null) => void) | null;
}

export function usePrompt() {
  const [state, setState] = useState<PromptState>({
    open: false,
    title: "",
    placeholder: "",
    submitLabel: "Submit",
    resolve: null,
  });
  const [input, setInput] = useState("");

  const prompt = useCallback((options: {
    title: string;
    placeholder?: string;
    submitLabel?: string;
  }): Promise<string | null> => {
    setInput("");
    return new Promise((resolve) => {
      setState({
        open: true,
        title: options.title,
        placeholder: options.placeholder || "",
        submitLabel: options.submitLabel || "Submit",
        resolve,
      });
    });
  }, []);

  const handleClose = useCallback((value: string | null) => {
    state.resolve?.(value);
    setState(prev => ({ ...prev, open: false, resolve: null }));
  }, [state.resolve]);

  const PromptDialog = () => {
    if (!state.open) return null;
    return (
      <Modal open={state.open} onClose={() => handleClose(null)} title={state.title}>
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={state.placeholder}
          className="w-full bg-black border border-zinc-800 rounded-2xl py-4 px-5 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all mb-6"
          onKeyDown={(e) => {
            if (e.key === "Enter" && input.trim()) handleClose(input.trim());
          }}
        />
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleClose(null)}
            className="py-3.5 bg-zinc-800 text-white font-bold rounded-2xl border border-white/5 active:scale-95 transition-transform"
          >
            Cancel
          </button>
          <button
            onClick={() => input.trim() && handleClose(input.trim())}
            className="py-3.5 bg-orange-500 text-white font-bold rounded-2xl active:scale-95 transition-transform"
          >
            {state.submitLabel}
          </button>
        </div>
      </Modal>
    );
  };

  return { prompt, PromptDialog };
}

// --- useToast Hook ---

export function useToast() {
  const [state, setState] = useState<{ open: boolean; message: string; type: "success" | "error" }>({
    open: false,
    message: "",
    type: "success",
  });

  const toast = useCallback((message: string, type: "success" | "error" = "success") => {
    setState({ open: true, message, type });
  }, []);

  const close = useCallback(() => {
    setState(prev => ({ ...prev, open: false }));
  }, []);

  const ToastContainer = () => (
    <Toast message={state.message} type={state.type} open={state.open} onClose={close} />
  );

  return { toast, ToastContainer };
}

