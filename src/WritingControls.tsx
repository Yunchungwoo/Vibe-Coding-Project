import { useEffect, useRef, type ReactNode } from "react";
import { X, Leaf, LockKeyhole } from "lucide-react";
export function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const element = dialog.current;
    element?.showModal();
    return () => {
      element?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="modal"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      aria-labelledby="modal-title"
    >
      <button
        className="icon-button modal-close"
        onClick={close}
        aria-label="닫기"
      >
        <X size={20} />
      </button>
      <div className="modal-symbol">
        <Leaf size={25} />
      </div>
      <h2 id="modal-title">{title}</h2>
      {children}
    </dialog>
  );
}
export function TextArea({
  value,
  onChange,
  id,
  label,
  placeholder,
  readOnly = false,
}: {
  value: string;
  onChange: (s: string) => void;
  id: string;
  label: string;
  placeholder?: string;
  readOnly?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = `${Math.max(240, ref.current.scrollHeight)}px`;
    }
  }, [value]);
  return (
    <>
      <label className="editor-label" htmlFor={id}>
        {label}
        {readOnly && (
          <span>
            <LockKeyhole size={13} /> 원문 보존 중
          </span>
        )}
      </label>
      <textarea
        ref={ref}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        placeholder={placeholder}
      />
    </>
  );
}
