type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function formatMsg(level: LogLevel, context: string, msg: string): string {
  const time = new Date().toTimeString().split(' ')[0];
  const lvl  = level.toUpperCase().padEnd(5);
  return `[${time}] ${lvl} [${context}] ${msg}`;
}

export function createLogger(context: string) {
  return {
    info:  (msg: string, ...args: any[]) =>
      console.log(formatMsg('info',  context, msg), ...args),

    warn:  (msg: string, ...args: any[]) =>
      console.warn(formatMsg('warn',  context, msg), ...args),

    error: (msg: string, ...args: any[]) =>
      console.error(formatMsg('error', context, msg), ...args),

    debug: (msg: string, ...args: any[]) => {
      if (process.env.NODE_ENV === 'development') {
        console.debug(formatMsg('debug', context, msg), ...args);
      }
    },
  };
}