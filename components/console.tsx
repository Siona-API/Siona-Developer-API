import { TerminalWindowIcon, LoaderIcon, CrossSmallIcon, NetworkIcon } from './icons';
import { Button } from './ui/button';
import { Connection, TransactionSignature } from '@solana/web3.js';
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { ConsoleOutput, TransactionStatus } from './block';
import { cn } from '@/lib/utils';

interface ConsoleProps {
  consoleOutputs: Array<ConsoleOutput>;
  setConsoleOutputs: Dispatch<SetStateAction<Array<ConsoleOutput>>>;
  connection?: Connection;
}

interface TransactionMonitor {
  signature: TransactionSignature;
  status: TransactionStatus;
  timestamp: number;
}

export function Console({ consoleOutputs, setConsoleOutputs, connection }: ConsoleProps) {
  const [height, setHeight] = useState<number>(300);
  const [isResizing, setIsResizing] = useState(false);
  const [transactions, setTransactions] = useState<TransactionMonitor[]>([]);
  const [networkStatus, setNetworkStatus] = useState<'connected' | 'error' | 'loading'>('loading');
  const consoleEndRef = useRef<HTMLDivElement>(null);
  const minHeight = 100;
  const maxHeight = 800;

  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (e: MouseEvent) => {
      if (isResizing) {
        const newHeight = window.innerHeight - e.clientY;
        if (newHeight >= minHeight && newHeight <= maxHeight) {
          setHeight(newHeight);
        }
      }
    },
    [isResizing],
  );

  const monitorTransaction = useCallback(async (signature: TransactionSignature) => {
    if (!connection) return;

    try {
      setTransactions(prev => [...prev, {
        signature,
        status: 'pending',
        timestamp: Date.now()
      }]);

      const status = await connection.confirmTransaction(signature);
      
      if (status.value.err) {
        setConsoleOutputs(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            content: `Transaction failed: ${status.value.err.toString()}`,
            status: 'failed',
            timestamp: new Date().toISOString()
          }
        ]);
        setTransactions(prev => 
          prev.map(tx => 
            tx.signature === signature 
              ? { ...tx, status: 'error' } 
              : tx
          )
        );
      } else {
        setConsoleOutputs(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            content: `Transaction confirmed: ${signature}`,
            status: 'completed',
            timestamp: new Date().toISOString()
          }
        ]);
        setTransactions(prev => 
          prev.map(tx => 
            tx.signature === signature 
              ? { ...tx, status: 'confirmed' } 
              : tx
          )
        );
      }
    } catch (error) {
      console.error('Error monitoring transaction:', error);
      setConsoleOutputs(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          content: `Error monitoring transaction: ${error.message}`,
          status: 'failed',
          timestamp: new Date().toISOString()
        }
      ]);
    }
  }, [connection, setConsoleOutputs]);

  useEffect(() => {
    if (connection) {
      const checkConnection = async () => {
        try {
          await connection.getVersion();
          setNetworkStatus('connected');
        } catch {
          setNetworkStatus('error');
        }
      };
      checkConnection();
    }
  }, [connection]);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [consoleOutputs]);

  const formatTimestamp = (timestamp: string | number) => {
    if (typeof timestamp === 'number') {
      return new Date(timestamp).toLocaleTimeString();
    }
    return new Date(timestamp).toLocaleTimeString();
  };

  return consoleOutputs.length > 0 ? (
    <>
      <div
        className="h-2 w-full fixed cursor-ns-resize z-50"
        onMouseDown={startResizing}
        style={{ bottom: height - 4 }}
        role="slider"
        aria-valuenow={minHeight}
      />
      <div
        className={cn(
          'fixed flex flex-col bottom-0 dark:bg-zinc-900 bg-zinc-50 w-full border-t z-40 overflow-y-scroll dark:border-zinc-700 border-zinc-200',
          {
            'select-none': isResizing,
          },
        )}
        style={{ height }}
      >
        <div className="flex flex-row justify-between items-center w-full h-fit border-b dark:border-zinc-700 border-zinc-200 px-2 py-1 sticky top-0 z-50 bg-muted">
          <div className="text-sm pl-2 dark:text-zinc-50 text-zinc-800 flex flex-row gap-3 items-center">
            <div className="text-muted-foreground">
              <TerminalWindowIcon />
            </div>
            <div>Console</div>
            <div className={cn(
              "size-2 rounded-full",
              {
                "bg-green-500": networkStatus === 'connected',
                "bg-red-500": networkStatus === 'error',
                "bg-yellow-500 animate-pulse": networkStatus === 'loading'
              }
            )} />
          </div>
          <Button
            variant="ghost"
            className="size-fit p-1 hover:dark:bg-zinc-700 hover:bg-zinc-200"
            size="icon"
            onClick={() => setConsoleOutputs([])}
          >
            <CrossSmallIcon />
          </Button>
        </div>
        <div>
          {consoleOutputs.map((consoleOutput, index) => (
            <div
              key={consoleOutput.id}
              className="px-4 py-2 flex flex-row text-sm border-b dark:border-zinc-700 border-zinc-200 dark:bg-zinc-900 bg-zinc-50 font-mono"
            >
              <div className="w-20 shrink-0 text-muted-foreground">
                {formatTimestamp(consoleOutput.timestamp)}
              </div>
              <div
                className={cn('w-12 shrink-0', {
                  'text-muted-foreground': consoleOutput.status === 'in_progress',
                  'text-emerald-500': consoleOutput.status === 'completed',
                  'text-red-400': consoleOutput.status === 'failed',
                })}
              >
                [{index + 1}]
              </div>
              {consoleOutput.status === 'in_progress' ? (
                <div className="animate-spin size-fit self-center">
                  <LoaderIcon />
                </div>
              ) : (
                <div className="dark:text-zinc-50 text-zinc-900 whitespace-pre-line">
                  {consoleOutput.content}
                </div>
              )}
            </div>
          ))}
          <div ref={consoleEndRef} />
        </div>
      </div>
    </>
  ) : null;
}