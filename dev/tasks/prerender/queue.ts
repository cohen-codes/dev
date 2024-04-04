type Task = () => Promise<void>;

export class AsyncQueue {
  private tasks: Task[] = [];
  private activeTasks: number = 0;
  private delay: number;
  private concurrency: number;
  private isProcessing: boolean = false;

  constructor(concurrency: number, delay: number, autoStart: boolean) {
    this.concurrency = concurrency;
    this.delay = delay;

    if (autoStart) {
      this.startProcessing();
    }
  }

  addTask(task: Task) {
    this.tasks.push(
      () =>
        new Promise((resolve) => {
          task()
            .then(resolve)
            .finally(() => {
              this.activeTasks--;
              if (this.isProcessing) {
                this.runNextTask();
              }
            });
        })
    );

    if (this.isProcessing && this.activeTasks < this.concurrency) {
      this.runNextTask();
    }
  }

  private runNextTask() {
    if (this.tasks.length > 0 && this.activeTasks < this.concurrency) {
      const task = this.tasks.shift()!;
      this.activeTasks++;
      task();
      setTimeout(() => this.runNextTask(), this.delay);
    }
  }

  startProcessing() {
    this.isProcessing = true;
    while (this.activeTasks < this.concurrency) {
      this.runNextTask();
    }
  }

  async waitUntilAllFinished() {
    while (this.tasks.length > 0 || this.activeTasks > 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}
