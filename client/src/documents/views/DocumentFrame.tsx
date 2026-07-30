import { useRef } from "react";
import { Printer } from "lucide-react";
import { SecondaryButton } from "@/components";

/** Renders a self-contained document in a sandboxed iframe and offers a
 *  print / save-as-PDF action via the browser print dialog. */
export function DocumentFrame({ content }: { content: string }) {
  const frameRef = useRef<HTMLIFrameElement>(null);

  const print = () => {
    const frame = frameRef.current;
    if (frame?.contentWindow) {
      frame.contentWindow.focus();
      frame.contentWindow.print();
    }
  };

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-2xl border bg-white">
        <iframe
          ref={frameRef}
          title="Документ"
          srcDoc={content}
          className="h-[440px] w-full"
        />
      </div>
      <SecondaryButton fullWidth icon={Printer} onClick={print}>
        Печать / Сохранить PDF
      </SecondaryButton>
    </div>
  );
}
