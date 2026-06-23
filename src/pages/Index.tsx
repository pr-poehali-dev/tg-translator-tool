import { useState, useRef, useCallback } from 'react';
import JSZip from 'jszip';
import Icon from '@/components/ui/icon';

const TRANSLATE_URL = 'https://functions.poehali.dev/995c01dd-766a-46de-9b29-85a35df44ead';

type Stage = 'idle' | 'packing' | 'translating' | 'done' | 'error';

const STEPS = [
  { n: '01', title: 'Закиньте папку с игрой', text: 'Просто перетащите папку целиком прямо на эту страницу — всё остальное произойдёт само.' },
  { n: '02', title: 'Магия переводчика', text: 'Сайт находит все текстовые файлы внутри и переводит их на русский язык, сохраняя структуру.' },
  { n: '03', title: 'Скачайте и замените', text: 'Получите готовый архив. Распакуйте его и замените папку игры — запустите и играйте на русском.' },
];

export default function Index() {
  const [folderName, setFolderName] = useState<string | null>(null);
  const [fileCount, setFileCount] = useState(0);
  const [stage, setStage] = useState<Stage>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(async (files: File[]) => {
    if (!files.length) return;

    type WebkitFile = File & { webkitRelativePath?: string };
    const firstPath = (files[0] as WebkitFile).webkitRelativePath || files[0].name;
    const rootFolder = firstPath.split('/')[0] || 'game';
    const translatable = files.filter(f => /\.(txt|json)$/i.test(f.name));
    setFolderName(rootFolder);
    setFileCount(translatable.length);
    setStage('packing');
    setErrorMsg('');

    try {
      const zip = new JSZip();
      for (const file of files) {
        const path = (file as WebkitFile).webkitRelativePath || file.name;
        zip.file(path, await file.arrayBuffer());
      }
      const zipB64 = await zip.generateAsync({ type: 'base64' });

      setStage('translating');

      const res = await fetch(TRANSLATE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zip_b64: zipB64, target: 'ru' }),
      });
      if (!res.ok) throw new Error('Сервер не смог обработать файлы');
      const data = await res.json();

      const outBytes = Uint8Array.from(atob(data.zip_b64), c => c.charCodeAt(0));
      const blob = new Blob([outBytes], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${rootFolder}_ru.zip`;
      a.click();
      URL.revokeObjectURL(url);

      setStage('done');
    } catch (e) {
      setStage('error');
      setErrorMsg(e instanceof Error ? e.message : 'Неизвестная ошибка');
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const items = e.dataTransfer.items;
    if (!items) return;
    const files: File[] = [];

    const readEntry = (entry: FileSystemEntry): Promise<void> => {
      if (entry.isFile) {
        return new Promise(res => (entry as FileSystemFileEntry).file(f => { files.push(f); res(); }));
      }
      if (entry.isDirectory) {
        const reader = (entry as FileSystemDirectoryEntry).createReader();
        return new Promise(res => reader.readEntries(async entries => {
          await Promise.all(entries.map(readEntry));
          res();
        }));
      }
      return Promise.resolve();
    };

    const promises: Promise<void>[] = [];
    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry();
      if (entry) promises.push(readEntry(entry));
    }
    Promise.all(promises).then(() => processFiles(files));
  }, [processFiles]);

  const isLoading = stage === 'packing' || stage === 'translating';

  return (
    <div className="min-h-screen bg-[#0d0d0f] text-neutral-100 font-sans antialiased">
      <div className="pointer-events-none fixed inset-0 [background:radial-gradient(circle_at_20%_0%,rgba(180,160,120,0.10),transparent_45%),radial-gradient(circle_at_85%_100%,rgba(120,140,170,0.08),transparent_45%)]" />

      <div className="relative mx-auto max-w-5xl px-6 sm:px-10">

        <header className="flex items-center justify-between py-8 animate-fade-up">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md border border-amber-200/20 bg-amber-100/5">
              <Icon name="Languages" size={17} className="text-amber-200/90" />
            </div>
            <span className="font-mono text-sm tracking-tight text-neutral-400">локализатор</span>
          </div>
          <span className="font-mono text-xs text-neutral-600">v0.2 · beta</span>
        </header>

        <section className="pt-14 pb-16 sm:pt-20 animate-fade-up" style={{ animationDelay: '80ms' }}>
          <p className="mb-6 font-mono text-xs uppercase tracking-[0.3em] text-amber-200/60">
            русификатор визуальных новелл
          </p>
          <h1 className="font-display text-[clamp(2.8rem,8vw,5.5rem)] font-medium leading-[0.95] tracking-tight">
            Кидай папку —<br />
            <span className="italic text-amber-100/90">получи игру на русском</span>
          </h1>
          <p className="mt-8 max-w-xl text-lg font-light leading-relaxed text-neutral-400">
            Перетащи папку с игрой прямо сюда. Никакого кода, никаких настроек —
            только папка внутрь и архив с переводом наружу.
          </p>
        </section>

        <section className="pb-24 animate-fade-up" style={{ animationDelay: '160ms' }}>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => !isLoading && inputRef.current?.click()}
            className={`relative cursor-pointer rounded-2xl border border-dashed p-14 text-center transition-all duration-300 sm:p-24 ${
              dragging
                ? 'border-amber-300/70 bg-amber-100/[0.05] scale-[1.01]'
                : 'border-neutral-700/70 hover:border-neutral-500 hover:bg-white/[0.012]'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              // @ts-expect-error webkitdirectory не в стандартных типах
              webkitdirectory="true"
              multiple
              onChange={(e) => e.target.files && processFiles(Array.from(e.target.files))}
            />

            <div className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border transition-all duration-500 ${
              stage === 'done' ? 'border-emerald-500/40 bg-emerald-500/10' :
              isLoading ? 'border-amber-300/30 bg-amber-100/5' :
              'border-neutral-700 bg-neutral-900/60'
            }`}>
              {stage === 'done'
                ? <Icon name="CheckCheck" size={26} className="text-emerald-400" />
                : isLoading
                  ? <Icon name="Loader2" size={26} className="text-amber-200 animate-spin" />
                  : <Icon name="FolderOpen" size={26} className="text-neutral-400" />
              }
            </div>

            {stage === 'idle' && (
              <>
                <p className="text-xl font-light text-neutral-200">Перетащи папку с игрой сюда</p>
                <p className="mt-2 text-sm text-neutral-500">или нажми, чтобы выбрать папку</p>
              </>
            )}
            {stage === 'packing' && (
              <div className="space-y-1">
                <p className="text-lg font-light text-amber-100">Упаковываем файлы...</p>
                {folderName && <p className="font-mono text-xs text-neutral-500">{folderName} · {fileCount} текстовых файлов</p>}
              </div>
            )}
            {stage === 'translating' && (
              <div className="space-y-1">
                <p className="text-lg font-light text-amber-100">Переводим на русский...</p>
                {folderName && <p className="font-mono text-xs text-neutral-500">{folderName} · {fileCount} файлов</p>}
                <p className="font-mono text-xs text-neutral-600 mt-2">Это может занять несколько минут</p>
              </div>
            )}
            {stage === 'done' && (
              <div className="space-y-2">
                <p className="text-lg font-light text-emerald-300">Архив скачан на устройство!</p>
                <p className="text-sm text-neutral-500">Распакуй и замени папку игры — она уже на русском</p>
                <button
                  onClick={(e) => { e.stopPropagation(); setStage('idle'); setFolderName(null); }}
                  className="mt-4 inline-flex items-center gap-2 font-mono text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
                >
                  <Icon name="RotateCcw" size={13} /> Перевести ещё одну игру
                </button>
              </div>
            )}
            {stage === 'error' && (
              <div className="space-y-2">
                <p className="text-lg font-light text-red-400">Что-то пошло не так</p>
                <p className="font-mono text-xs text-neutral-500">{errorMsg}</p>
                <button
                  onClick={(e) => { e.stopPropagation(); setStage('idle'); }}
                  className="mt-3 inline-flex items-center gap-2 font-mono text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
                >
                  <Icon name="RotateCcw" size={13} /> Попробовать снова
                </button>
              </div>
            )}
          </div>

          <p className="mt-4 text-center font-mono text-xs text-neutral-600">
            Переводит .txt и .json · структура папки сохраняется полностью
          </p>
        </section>

        <section className="border-t border-neutral-800/80 py-20">
          <h2 className="mb-12 font-display text-3xl font-medium tracking-tight text-neutral-200">
            Как это работает
          </h2>
          <div className="grid gap-px overflow-hidden rounded-2xl border border-neutral-800/80 bg-neutral-800/40 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <div
                key={s.n}
                className="bg-[#0d0d0f] p-8 transition-colors hover:bg-white/[0.015] animate-fade-up"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <span className="font-mono text-xs text-amber-200/50">{s.n}</span>
                <h3 className="mt-4 font-display text-2xl font-medium text-neutral-100">{s.title}</h3>
                <p className="mt-3 text-sm font-light leading-relaxed text-neutral-400">{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="border-t border-neutral-800/80 py-10 text-center">
          <p className="font-mono text-xs text-neutral-600">локализатор · перевод визуальных новелл без кода</p>
        </footer>
      </div>
    </div>
  );
}