import { useState } from 'react';
import { ChevronDown, FileText, HelpCircle, Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge, Button, Card, ConfirmDialog, Dialog, EmptyState, ErrorState, IconButton, Input, PageHeader, Segmented, Select, Skeleton, Switch, Tabs, Textarea } from '@/components/ui';
import { useFaqs, usePages } from '@/hooks/queries';
import { qk } from '@/hooks/queryKeys';
import { useApiMutation } from '@/hooks/useApiMutation';
import { cn } from '@/lib/cn';
import { formatDateTime, titleCase } from '@/lib/format';
import { engagementApi } from '@/services/api';
import type { FaqInput } from '@/services/api/engagement.api';
import type { CmsPage, Faq } from '@/types/models';

export default function ContentPage() {
  const [tab, setTab] = useState<'faqs' | 'pages'>('faqs');
  return (
    <>
      <PageHeader title="Content" description="Help-centre FAQs and legal pages shown inside the apps." />
      <Tabs label="Content type" className="mb-4" value={tab} onChange={setTab} tabs={[{ value: 'faqs', label: 'FAQs' }, { value: 'pages', label: 'Legal pages' }]} />
      {tab === 'faqs' ? <Faqs /> : <Pages />}
    </>
  );
}

const AUD: Faq['audience'][] = ['customer', 'provider', 'delivery', 'all'];

function Faqs() {
  const q = useFaqs();
  const [aud, setAud] = useState<Faq['audience']>('customer');
  const [open, setOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState<Faq | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Faq | null>(null);
  const toggle = useApiMutation((f: Faq) => engagementApi.saveFaq({ ...f, published: !f.published }, f.id), { invalidate: [qk.content.faqs], success: (f) => (f.published ? 'FAQ published' : 'FAQ unpublished') });
  const del = useApiMutation((id: string) => engagementApi.deleteFaq(id), { invalidate: [qk.content.faqs], success: 'FAQ deleted', onSuccess: () => setDeleting(null) });
  const list = (q.data ?? []).filter((f) => f.audience === aud);
  return (
    <>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Segmented label="Audience" value={aud} onChange={setAud} options={AUD.map((a) => ({ value: a, label: a === 'all' ? 'Everyone' : `${titleCase(a)}s`, count: (q.data ?? []).filter((f) => f.audience === a).length }))} />
        <Button variant="panel" size="sm" icon={Plus} onClick={() => setEditing('new')}>
          Add FAQ
        </Button>
      </div>
      {q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : q.isPending ? (
        <Skeleton className="h-64" />
      ) : list.length ? (
        <Card padded={false}>
          <ul className="divide-y divide-line">
            {list.map((f) => (
              <li key={f.id}>
                <div className="flex items-center gap-2 px-4 py-3">
                  <button type="button" aria-expanded={open === f.id} onClick={() => setOpen(open === f.id ? null : f.id)} className="focus-ring flex min-w-0 flex-1 items-center gap-2 rounded text-left">
                    <ChevronDown size={16} className={cn('shrink-0 text-ink-3 transition-transform', open === f.id && 'rotate-180')} />
                    <span className={cn('font-medium', f.published ? 'text-ink' : 'text-ink-3')}>{f.question}</span>
                    {!f.published ? <Badge size="xs">Draft</Badge> : null}
                  </button>
                  <Switch size="sm" label="Published" checked={f.published} disabled={toggle.isPending} onChange={() => toggle.mutate(f)} />
                  <IconButton icon={Pencil} label="Edit FAQ" size="sm" onClick={() => setEditing(f)} />
                  <IconButton icon={Trash2} label="Delete FAQ" size="sm" variant="danger" onClick={() => setDeleting(f)} />
                </div>
                {open === f.id ? <p className="animate-fade-in px-4 pb-4 pl-10 text-sm text-ink-2">{f.answer}</p> : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <Card>
          <EmptyState icon={HelpCircle} title="No FAQs for this audience" />
        </Card>
      )}
      {editing ? <FaqDialog faq={editing === 'new' ? undefined : editing} audience={aud} count={list.length} onClose={() => setEditing(null)} /> : null}
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => deleting && del.mutate(deleting.id)} loading={del.isPending} tone="danger" icon={Trash2} title="Delete FAQ?" confirmLabel="Delete" message={deleting?.question} />
    </>
  );
}

function FaqDialog({ faq, audience, count, onClose }: { faq?: Faq; audience: Faq['audience']; count: number; onClose: () => void }) {
  const [v, setV] = useState<FaqInput>(faq ? { question: faq.question, answer: faq.answer, audience: faq.audience, published: faq.published, sortOrder: faq.sortOrder } : { question: '', answer: '', audience, published: true, sortOrder: count + 1 });
  const [touched, setTouched] = useState(false);
  const errs = { question: v.question.trim().length < 8 ? 'At least 8 characters' : undefined, answer: v.answer.trim().length < 10 ? 'At least 10 characters' : undefined };
  const m = useApiMutation(() => engagementApi.saveFaq(v, faq?.id), { invalidate: [qk.content.faqs], success: faq ? 'FAQ saved' : 'FAQ added', onSuccess: onClose });
  return (
    <Dialog
      open
      onClose={onClose}
      title={faq ? 'Edit FAQ' : 'New FAQ'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="panel" loading={m.isPending} onClick={() => (setTouched(true), !errs.question && !errs.answer && m.mutate())}>
            Save
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input label="Question" value={v.question} onChange={(e) => setV({ ...v, question: e.target.value })} error={touched ? errs.question : undefined} />
        <Textarea label="Answer" rows={5} value={v.answer} onChange={(e) => setV({ ...v, answer: e.target.value })} error={touched ? errs.answer : undefined} />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Shown to" value={v.audience} onChange={(e) => setV({ ...v, audience: e.target.value as Faq['audience'] })} options={AUD.map((a) => ({ value: a, label: a === 'all' ? 'Everyone' : `${titleCase(a)}s` }))} />
          <Input label="Order" type="number" min={1} value={v.sortOrder} onChange={(e) => setV({ ...v, sortOrder: Number(e.target.value) || 1 })} />
        </div>
        <label className="flex items-center justify-between rounded-xl border border-line px-3 py-2.5 text-sm font-medium text-ink">
          Published
          <Switch label="Published" checked={v.published} onChange={(p) => setV({ ...v, published: p })} />
        </label>
      </div>
    </Dialog>
  );
}

function Pages() {
  const q = usePages();
  const [id, setId] = useState('');
  const page = q.data?.find((p) => p.id === id) ?? q.data?.[0];
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (!q.data || !page) return <Skeleton className="h-96" />;
  return (
    <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
      <Card padded={false} className="h-fit p-1.5">
        <ul className="flex gap-1 overflow-x-auto lg:flex-col">
          {q.data.map((p) => (
            <li key={p.id} className="shrink-0">
              <button type="button" aria-current={p.id === page.id ? 'page' : undefined} onClick={() => setId(p.id)} className={cn('focus-ring flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium', p.id === page.id ? 'bg-panel-soft text-panel-ink' : 'text-ink-2 hover:bg-surface-2')}>
                <FileText size={15} /> {p.title}
              </button>
            </li>
          ))}
        </ul>
      </Card>
      <PageEditor key={page.id} page={page} />
    </div>
  );
}

function PageEditor({ page }: { page: CmsPage }) {
  const [title, setTitle] = useState(page.title);
  const [body, setBody] = useState(page.body);
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const dirty = title !== page.title || body !== page.body;
  const m = useApiMutation(() => engagementApi.savePage(page.id, title, body), { invalidate: [qk.content.pages], success: `${title} published` });
  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ink-3">
          Last published {formatDateTime(page.updatedAt)} by {page.updatedBy}
        </p>
        <Segmented size="sm" label="Mode" value={mode} onChange={setMode} options={[{ value: 'edit', label: 'Edit' }, { value: 'preview', label: 'Preview' }]} />
      </div>
      {mode === 'edit' ? (
        <div className="flex flex-col gap-4">
          <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea label="Content" rows={14} value={body} onChange={(e) => setBody(e.target.value)} hint="Plain text. Blank lines start a new paragraph." className="font-[inherit]" />
        </div>
      ) : (
        <article className="max-w-prose">
          <h2 className="text-xl font-bold text-ink">{title}</h2>
          {body.split(/\n{2,}/).map((para, i) => (
            <p key={i} className="mt-3 whitespace-pre-line text-base leading-relaxed text-ink-2">
              {para}
            </p>
          ))}
        </article>
      )}
      <div className="mt-5 flex justify-end gap-2 border-t border-line pt-4">
        <Button variant="outline" disabled={!dirty} onClick={() => (setTitle(page.title), setBody(page.body))}>
          Discard
        </Button>
        <Button variant="panel" disabled={!dirty || body.trim().length < 20} loading={m.isPending} onClick={() => m.mutate()}>
          Publish changes
        </Button>
      </div>
    </Card>
  );
}
