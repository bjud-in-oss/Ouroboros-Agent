import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

interface TerminalPanelProps {
  stream: ReadableStream<string> | null;
}

export const TerminalPanel: React.FC<TerminalPanelProps> = ({ stream }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const termInstanceRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<string> | null>(null);

  // Initialize Terminal
  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new Terminal({
      theme: {
        background: '#0c0c0e',
        foreground: '#e4e4e7',
        cursor: '#71717a',
        selectionBackground: '#27272a',
      },
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: 13,
      cursorBlink: true,
      convertEol: true, // Handle \n to \r\n automatically
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(terminalRef.current);
    fitAddon.fit();

    termInstanceRef.current = term;
    fitAddonRef.current = fitAddon;

    term.writeln('\x1b[38;5;240m[System: Virtual Terminal Initialized]\x1b[0m');
    term.write('\r\n\x1b[32mouroboros@workspace\x1b[0m:\x1b[34m~\x1b[0m$ ');

    let resizeTimeout: NodeJS.Timeout;
    const resizeObserver = new ResizeObserver(() => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (fitAddonRef.current) {
          fitAddonRef.current.fit();
        }
      }, 50); // Debounce
    });

    resizeObserver.observe(terminalRef.current);

    return () => {
      resizeObserver.disconnect();
      clearTimeout(resizeTimeout);
      term.dispose();
      termInstanceRef.current = null;
      fitAddonRef.current = null;
    };
  }, []);

  // Handle incoming stream
  useEffect(() => {
    if (!stream || !termInstanceRef.current) return;

    const term = termInstanceRef.current;
    
    // We visually demarcate a new command with a prompt (if it's not the very first stream right after boot)
    term.write('\r\n\x1b[32mouroboros@workspace\x1b[0m:\x1b[34m~\x1b[0m$ \x1b[38;5;244m[process running...]\x1b[0m\r\n');

    let isCancelled = false;

    const consumeStream = async () => {
      const reader = stream.getReader();
      readerRef.current = reader;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done || isCancelled) break;

          // Time-sliced writing to prevent UI freezing
          await new Promise<void>((resolve) => {
            // Write the chunk to terminal
            term.write(value, () => {
              // Yield to main thread for a micro-tick (~16ms/RAF equivalent)
              requestAnimationFrame(() => resolve());
            });
          });
        }
      } catch (err: any) {
        if (!isCancelled) {
          term.writeln(`\r\n\x1b[31m[Stream Error: ${err.message}]\x1b[0m`);
        }
      } finally {
        if (!isCancelled) {
          term.write('\r\n\x1b[32mouroboros@workspace\x1b[0m:\x1b[34m~\x1b[0m$ ');
        }
        reader.releaseLock();
        readerRef.current = null;
      }
    };

    consumeStream();

    return () => {
      isCancelled = true;
      if (readerRef.current) {
        readerRef.current.cancel().catch(() => {});
        readerRef.current = null;
      }
    };
  }, [stream]);

  return (
    <div className="w-full h-full flex flex-col bg-[#0c0c0e]">
      <div className="h-8 border-b border-zinc-800 flex items-center px-4 shrink-0 bg-[#0c0c0e]">
        <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest cursor-default">Terminal</span>
      </div>
      <div className="flex-1 min-h-0 relative p-2">
        <div ref={terminalRef} className="absolute inset-0 w-full h-full overflow-hidden" />
      </div>
    </div>
  );
};
