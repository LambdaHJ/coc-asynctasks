import { Disposable, disposeAll, Emitter } from 'coc.nvim';

export abstract class BaseComponent<
  Instance,
  Options extends object,
  InputResult = void
> implements Disposable {
  protected _inited = false;
  protected storeOptions?: Options;
  protected readonly disposables: Disposable[] = [];
  protected readonly closeEmitter = new Emitter<InputResult | undefined>();

  dispose() {
    disposeAll(this.disposables);
  }

  protected _instance?: Instance;

  protected async instance() {
    if (!this._instance) {
      this._instance = await this._create();
    }
    return this._instance;
  }

  async input(options: Options): Promise<InputResult | undefined> {
    return new Promise(async (resolve) => {
      this.closeEmitter.event(resolve);
      await this.open(options);
    });
  }

  async opened(): Promise<boolean> {
    return this._opened(await this.instance());
  }
  protected abstract async _opened(instance: Instance): Promise<boolean>;

  protected abstract async _create(): Promise<Instance>;

  async open(options: Options) {
    this.storeOptions = options;
    return this._open(await this.instance(), options);
  }
  protected abstract async _open(
    instance: Instance,
    options: Options,
  ): Promise<void>;

  async resize() {
    if (!this.storeOptions) {
      return;
    }
    return this._resize(await this.instance(), this.storeOptions);
  }
  protected abstract async _resize(
    instance: Instance,
    options: Options,
  ): Promise<void>;

  async close(inputResult?: InputResult): Promise<void> {
    await this._close(await this.instance(), inputResult);
    this.closeEmitter.fire(inputResult);
  }
  protected abstract async _close(
    instance: Instance,
    inputResult?: InputResult,
  ): Promise<void>;
}
