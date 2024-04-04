type Task = () => Promise<void>;

export class AsyncQueue {
  private tasks: Task[] = [];
  private activeTasks: number = 0;
  private delay: number;
  private _concurrency: number; // renamed with a underscore prefix
  private isProcessing: boolean = false;
  private defaultTimeout: number; // New variable to store default timeout

  constructor(
    concurrency: number,
    delay: number,
    autoStart: boolean,
    defaultTimeout: number = 30000
  ) {
    // Add defaultTimeout to constructor
    this._concurrency = concurrency;
    this.delay = delay;
    this.defaultTimeout = defaultTimeout;

    if (autoStart) {
      this.startProcessing();
    }
  }

  // Setter to update concurrency
  set concurrency(value: number) {
    this._concurrency = value;
    if (this.isProcessing) {
      while (this.activeTasks < this._concurrency) {
        this.runNextTask();
      }
    }
  }

  // Getter to retrieve current concurrency
  get concurrency(): number {
    return this._concurrency;
  }

  addTask(task: Task, timeout: number = this.defaultTimeout) {
    // timeout parameter added
    this.tasks.push(
      () =>
        new Promise(async (resolve, reject) => {
          const timeoutPromise = new Promise<void>((_, rej) => {
            setTimeout(() => rej(new Error('Task Timeout')), timeout);
          });

          try {
            await Promise.race([task(), timeoutPromise]);
            resolve();
          } catch (error) {
            console.error('Task error:', error);
          } finally {
            this.activeTasks--;
            if (this.isProcessing) {
              this.runNextTask();
            }
          }
        })
    );

    if (this.isProcessing && this.activeTasks < this._concurrency) {
      this.runNextTask();
    }
  }

  startProcessing() {
    this.isProcessing = true;
    // Start only up to the minimum of the concurrency or the number of tasks.
    for (let i = 0; i < Math.min(this._concurrency, this.tasks.length); i++) {
      this.runNextTask();
    }
  }

  private runNextTask() {
    if (this.tasks.length > 0 && this.activeTasks < this._concurrency) {
      const task = this.tasks.shift()!;
      this.activeTasks++;
      task();
      // Start the next task after the delay, but only if we haven't hit the concurrency limit.
      if (this.activeTasks < this._concurrency) {
        setTimeout(() => this.runNextTask(), this.delay);
      }
    }
  }

  async waitUntilAllFinished() {
    while (this.tasks.length > 0 || this.activeTasks > 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}
