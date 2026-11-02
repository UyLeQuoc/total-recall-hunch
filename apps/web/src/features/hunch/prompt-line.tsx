import { ArrowUp } from "lucide-react";
import type { FormEvent, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface PromptLineProps {
  value: string;
  busy: boolean;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
}

export function PromptLine({ value, busy, onChange, onSubmit }: PromptLineProps) {
  const ready = value.trim().length >= 8 && !busy;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (ready) onSubmit(value);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (ready) onSubmit(value);
    }
  };
  return (
    <form className="flex items-start gap-2.5" onSubmit={submit} autoComplete="off">
      <Textarea
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="What's your hunch?"
        aria-label="Your hunch"
        className="min-h-6 resize-none rounded-none border-0 bg-transparent p-0 text-base leading-6 shadow-none focus-visible:ring-0 md:text-base dark:bg-transparent"
      />
      <Button
        type="submit"
        size="icon-xs"
        className="mt-px rounded-full"
        disabled={!ready}
        aria-label="Test it"
      >
        <ArrowUp strokeWidth={2.6} />
      </Button>
    </form>
  );
}
