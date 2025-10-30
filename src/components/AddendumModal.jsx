import { useState } from "react";
import Modal from "./UI/Modal";
import Field from "./UI/Field";
import Button from "./UI/Button";

export default function AddendumModal({ open, onClose, onConfirm, loading = false }) {
  const [text, setText] = useState("");

  const handleSubmit = async () => {
    if (!text.trim()) {
      return;
    }
    await onConfirm?.(text.trim());
    setText("");
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        setText("");
        onClose?.();
      }}
      title="Agregar addendum"
      footer={
        <div className="cluster">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={loading}>
            Guardar addendum
          </Button>
        </div>
      }
    >
      <Field label="Texto del addendum" required>
        {({ fieldId }) => (
          <textarea
            id={fieldId}
            className="textarea"
            rows={4}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        )}
      </Field>
    </Modal>
  );
}
