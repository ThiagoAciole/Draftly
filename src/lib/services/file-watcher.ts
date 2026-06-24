export interface FileWatcherCommands {
  watch(path: string): Promise<void>;
  unwatch(path: string): Promise<void>;
}

export interface FileWatcherSync {
  sync(paths: string[]): Promise<void>;
}

export function createFileWatcherSync(
  commands: FileWatcherCommands,
): FileWatcherSync {
  const watchedPaths = new Set<string>();
  let queue = Promise.resolve();

  async function apply(paths: string[]) {
    const desiredPaths = new Set(paths.filter(Boolean));

    for (const path of watchedPaths) {
      if (desiredPaths.has(path)) continue;
      await commands.unwatch(path);
      watchedPaths.delete(path);
    }

    for (const path of desiredPaths) {
      if (watchedPaths.has(path)) continue;
      await commands.watch(path);
      watchedPaths.add(path);
    }
  }

  return {
    sync(paths) {
      const operation = queue.catch(() => undefined).then(() => apply(paths));
      queue = operation.catch(() => undefined);
      return operation;
    },
  };
}
