import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AddToolDialog } from "@/components/Subscriptions/AddToolDialog";

export default function NewSubscription() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

  return (
    <AddToolDialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) navigate("/subscription/tools");
      }}
      onSuccess={() => {
        setOpen(false);
        navigate("/subscription/tools");
      }}
      editingTool={null}
    />
  );
}
