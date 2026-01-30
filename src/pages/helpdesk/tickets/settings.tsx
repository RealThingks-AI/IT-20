import { TicketConfiguration } from "@/components/helpdesk/TicketConfiguration";

export default function TicketSettings() {
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center gap-2 px-4 py-2">
          <h1 className="text-xl font-semibold tracking-tight">Ticket Settings</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <TicketConfiguration />
      </div>
    </div>
  );
}
