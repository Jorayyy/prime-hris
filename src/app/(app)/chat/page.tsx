import { Wrench } from "lucide-react";

export default function ChatPage() {
  return (
    <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-warning/10">
          <Wrench className="h-8 w-8 text-warning" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Under Maintenance</h2>
        <p className="mt-2 max-w-sm text-sm text-muted">
          The messaging feature is currently being improved. Check back soon!
        </p>
      </div>
    </div>
  );
}
