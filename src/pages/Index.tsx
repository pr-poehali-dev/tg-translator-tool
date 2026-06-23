import { useState, useRef, useCallback } from 'react';
import Icon from '@/components/ui/icon';

const STEPS = [
  {
    n: '01',
    title: 'Загрузите файл игры',
    text: 'Откройте папку с новеллой и найдите текстовые файлы сценария. Чаще всего это .rpy (Ren\'Py), .txt, .json или .ks. Перетащите их сюда.',
  },
  {
    n: '02',
    title: 'Дождитесь перевода',
    text: 'Локализатор распознаёт реплики персонажей и описания, сохраняя теги, имена и форматирование игры в неизменном виде.',
  },
  {
    n: '03',
    title: 'Верните файл в игру',
    text: 'Скачайте переведённый файл и положите его обратно в ту же папку, заменив оригинал. Перезапустите игру — она будет на русском.',
  },
];

const Index = () => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File | null) => {
    if (file) setFileName(file.name);
  }, []);

  return (
    <div className="min-h-screen bg-[#0d0d0f] text-neutral-100 font-sans antialiased selection:bg-amber-200/30">
      <div className="pointer-events-none fixed inset-0 opacity-[0.5] [background:radial-gradient(circle_at_20%_0%,rgba(180,160,120,0.12),transparent_45%),radial-gradient(circle_at_85%_100%,rgba(120,140,170,0.10),transparent_45%)]" />

      <div className="relative mx-auto max-w-5xl px-6 sm:px-10">
        {/* Header */}
        <header className="flex items-center justify-between py-8 animate-fade-up">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md border border-amber-200/20 bg-amber-100/5">
              <Icon name="Languages" size={17} className="text-amber-200/90" />
            </div>
            <span className="font-mono text-sm tracking-tight text-neutral-400">локализатор</span>
          </div>
          <span className="font-mono text-xs text-neutral-600">v0.1 · beta</span>
        </header>

        {/* Hero */}
        <section className="pt-14 pb-20 sm:pt-20 animate-fade-up" style={{ animationDelay: '80ms' }}>
          <p className="mb-6 font-mono text-xs uppercase tracking-[0.3em] text-amber-200/60">
            русификатор визуальных новелл
          </p>
          <h1 className="font-display text-[clamp(2.8rem,8vw,5.5rem)] font-medium leading-[0.95] tracking-tight">
            Переводите игры
            <br />
            <span className="italic text-amber-100/90">на родной язык</span>
          </h1>
          <p className="mt-8 max-w-xl text-lg font-light leading-relaxed text-neutral-400">
            Загрузите файлы сценария — локализатор аккуратно переведёт текст
            и подскажет, как вернуть его обратно в игру. Без кода и настроек.
          </p>
        </section>

        {/* Upload zone */}
        <section className="animate-fade-up pb-24" style={{ animationDelay: '160ms' }}>
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              handleFile(e.dataTransfer.files?.[0] ?? null);
            }}
            className={`group relative cursor-pointer overflow-hidden rounded-2xl border border-dashed p-12 text-center transition-all duration-300 sm:p-20 ${
              dragging
                ? 'border-amber-200/60 bg-amber-100/[0.04]'
                : 'border-neutral-700/70 hover:border-neutral-500 hover:bg-white/[0.015]'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept=".rpy,.txt,.json,.ks,.csv,.xml"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900/60 transition-transform duration-300 group-hover:scale-110">
              <Icon
                name={fileName ? 'FileCheck2' : 'UploadCloud'}
                size={24}
                className={fileName ? 'text-amber-200' : 'text-neutral-400'}
              />
            </div>
            {fileName ? (
              <>
                <p className="font-mono text-sm text-amber-100">{fileName}</p>
                <p className="mt-2 text-sm text-neutral-500">Файл готов к переводу</p>
              </>
            ) : (
              <>
                <p className="text-lg font-light text-neutral-200">
                  Перетащите файл игры сюда
                </p>
                <p className="mt-2 text-sm text-neutral-500">
                  или нажмите, чтобы выбрать · .rpy .txt .json .ks
                </p>
              </>
            )}
          </div>
        </section>

        {/* Steps */}
        <section className="border-t border-neutral-800/80 py-20">
          <h2 className="mb-12 font-display text-3xl font-medium tracking-tight text-neutral-200 animate-fade-up">
            Как это работает
          </h2>
          <div className="grid gap-px overflow-hidden rounded-2xl border border-neutral-800/80 bg-neutral-800/40 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <div
                key={s.n}
                className="animate-fade-up bg-[#0d0d0f] p-8 transition-colors hover:bg-white/[0.015]"
                style={{ animationDelay: `${i * 90}ms` }}
              >
                <span className="font-mono text-xs text-amber-200/50">{s.n}</span>
                <h3 className="mt-4 font-display text-2xl font-medium text-neutral-100">
                  {s.title}
                </h3>
                <p className="mt-3 text-sm font-light leading-relaxed text-neutral-400">
                  {s.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-neutral-800/80 py-10 text-center">
          <p className="font-mono text-xs text-neutral-600">
            локализатор · перевод визуальных новелл без кода
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
