"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckboxField, Field, FormError, SubmitButton, useAdminForm, type FormAction } from "@/components/admin/form-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  BODY_MAX,
  SUBJECT_MAX,
  TEMPLATES,
  VARIABLES,
  renderEmail,
  sampleVars,
  validateTemplate,
  type EmailBlock,
  type EmailKey,
} from "@/lib/email/templates";
import type { ActionResult } from "@/types/action";

// FR30 editor: subject/body with clickable variables, live preview with sample data,
// test send. Validation here mirrors the server (same validateTemplate()).

type Props = {
  templateKey: EmailKey;
  subject: string;
  body: string;
  enabled: boolean;
  sample: EmailBlock;
  save: FormAction;
  sendTest: (input: { subject: string; body: string }) => Promise<ActionResult<{ to: string }>>;
};

export function EmailTemplateEditor({ templateKey, subject: initialSubject, body: initialBody, enabled, sample, save, sendTest }: Props) {
  const def = TEMPLATES[templateKey];
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [testing, startTest] = useTransition();
  const { state, onSubmit, pending, formRef } = useAdminForm(save, "Đã lưu mẫu email");
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const lastField = useRef<"subject" | "body">("body");

  const problem = validateTemplate(templateKey, subject, body);
  const preview = useMemo(() => renderEmail({ subject, body }, sampleVars(), sample), [subject, body, sample]);

  /** Inserts `{name}` at the cursor of the field used last. */
  function insertVar(name: string) {
    const token = `{${name}}`;
    const el = lastField.current === "subject" ? subjectRef.current : bodyRef.current;
    const value = lastField.current === "subject" ? subject : body;
    const setValue = lastField.current === "subject" ? setSubject : setBody;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    setValue(value.slice(0, start) + token + value.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-4">
        <FormError state={state} />
        <Field label="Tiêu đề" htmlFor="subject">
          <Input
            ref={subjectRef}
            id="subject"
            name="subject"
            value={subject}
            maxLength={SUBJECT_MAX}
            onChange={(e) => setSubject(e.target.value)}
            onFocus={() => (lastField.current = "subject")}
            required
          />
        </Field>
        <Field
          label="Nội dung"
          htmlFor="body"
          hint="**chữ đậm** · [chữ liên kết](https://…) hoặc [Xem đơn]({link_don_hang}) · dòng trống = đoạn mới. Bảng thông tin và nút bấm được hệ thống tự thêm bên dưới."
        >
          <Textarea
            ref={bodyRef}
            id="body"
            name="body"
            value={body}
            rows={14}
            maxLength={BODY_MAX}
            onChange={(e) => setBody(e.target.value)}
            onFocus={() => (lastField.current = "body")}
            className="font-mono text-sm"
            required
          />
        </Field>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Biến (bấm để chèn)</span>
          <div className="flex flex-wrap gap-1.5">
            {def.variables.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => insertVar(v)}
                title={VARIABLES[v].label}
                className="rounded-md border bg-muted px-2 py-1 font-mono text-xs hover:bg-muted/60"
              >
                {`{${v}}`}
                {def.required.includes(v) && <span className="text-destructive">*</span>}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">* bắt buộc có trong tiêu đề hoặc nội dung.</p>
        </div>

        <CheckboxField id="is_enabled" name="is_enabled" label="Bật gửi email này" defaultChecked={enabled} />

        {problem && <p className="text-sm text-destructive">{problem}</p>}
        <div className="flex flex-wrap gap-2">
          <SubmitButton pending={pending}>Lưu mẫu email</SubmitButton>
          <Button
            type="button"
            variant="outline"
            disabled={testing || !!problem}
            onClick={() =>
              startTest(async () => {
                const result = await sendTest({ subject, body });
                if (result.ok) toast.success(`Đã gửi thử tới ${result.data.to}`);
                else toast.error(result.error);
              })
            }
          >
            {testing ? "Đang gửi…" : "Gửi thử cho tôi"}
          </Button>
        </div>
      </form>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Xem trước (dữ liệu mẫu)</span>
        <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Tiêu đề: </span>
          {preview.subject}
        </p>
        <iframe
          title="Xem trước email"
          srcDoc={preview.html}
          sandbox=""
          className="h-[640px] w-full rounded-lg border bg-white"
        />
      </div>
    </div>
  );
}
