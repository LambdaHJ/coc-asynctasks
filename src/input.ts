import {
  displayHeight,
  FloatingWindow,
  MultiFloatingWindow,
  versionName,
} from 'coc-helper';
import {
  commands,
  CompletionItemProvider,
  Disposable,
  events,
  languages,
  MapMode,
  workspace,
} from 'coc.nvim';
import { BaseComponent } from './Base';

export namespace Input {
  export interface Options {
    title?: string;
    /**
     * @default true
     */
    border?: boolean;
    /**
     * @default 'center'
     */
    relative?: 'center' | 'cursor-around';
    filetype?: string;
    /**
     * @default 30
     */
    width?: number;
    prompt?: string;
    defaultValue?: string;
    completion?: {
      short: string;
      provider: CompletionItemProvider;
    };
  }
}

type Instance = MultiFloatingWindow<'prompt' | 'input'>;

export class Input extends BaseComponent<
  Instance,
  Input.Options,
  string
> {
  protected static maxId = 0;
  protected static actionCmd = 'asynctasks.action_' + versionName;
  protected static inputMap: Map<
    number,
    {
      input: Input;
      instance: Instance;
      inputWin: FloatingWindow;
    }
  > = new Map();
  protected static _inited = false;


  protected completionDisposable?: Disposable;
  protected id = 0;
  protected genFiletype() {
    return 'asynctasks-' + this.id;
  }

  protected async changeMode(mode: MapMode, targetMode: MapMode) {
    if (mode === targetMode) {
      return;
    }
    if (targetMode === 'i') {
      if (mode === 'n') {
        await workspace.nvim.command('call feedkeys("i", "n")');
      }
    } else if (mode !== 'n') {
      await workspace.nvim.command('call feedkeys("\\<ESC>", "n")');
    }
  }

  protected async getContent() {
    const instance = await this.instance();
    const buf = instance.floatWinDict.input.buffer;
    const lines = await buf.getLines({
      start: 0,
      end: 1,
      strictIndexing: false,
    });
    return lines[0];
  }

  protected async confirm(type: 'cancel' | 'ok') {
    if (type === 'cancel') {
      await this.close();
    } else if (type === 'ok') {
      const content = await this.getContent();
      if (await this.validateContent(content)) {
        await this.close(await this.stringToValue(content));
      }
    }
  }

  protected _init() {
    if (Input._inited) {
      return;
    }
    Input._inited = true;

    this.disposables.push(
      events.on('BufEnter', async (bufnr) => {
        const it = Input.inputMap.get(bufnr);
        if (it) {
          return;
        }
        const openedInputs: Input[] = [];
        for (const it of Input.inputMap.values()) {
          if (await it.input.opened()) {
            openedInputs.push(it.input);
          }
        }
        await Promise.all(openedInputs.map((input) => input.close()));
      }),
      events.on('BufWinLeave', async (bufnr) => {
        const it = Input.inputMap.get(bufnr);
        if (!it) {
          return;
        }
        await it.inputWin.buffer.setOption('buftype', 'nofile');
      }),
      events.on('TextChangedI', async (bufnr) => {
        const it = Input.inputMap.get(bufnr);
        if (!it) {
          return;
        }
        await it.input.textChange('i');
      }),
      events.on('TextChanged', async (bufnr) => {
        const it = Input.inputMap.get(bufnr);
        if (!it) {
          return;
        }
        await it.input.textChange('n');
      }),
      commands.registerCommand(
        Input.actionCmd,
        async (
          type: 'cancel' | 'ok',
          bufnr: number,
          mode: MapMode,
          targetMode: MapMode,
        ) => {
          const it = Input.inputMap.get(bufnr);
          if (!it) {
            return;
          }
          await it.input.changeMode(mode, targetMode);
          await it.input.confirm(type);
        },
        undefined,
        true,
      ),
    );
  }

  protected async _create(): Promise<Instance> {
    this._init();
    Input.maxId++;
    this.id = Input.maxId;
    const instance = await MultiFloatingWindow.create({
      wins: {
        prompt: { mode: 'show' },
        input: { mode: 'base' },
      },
    });
    const inputWin = instance.floatWinDict.input;
    if (!Input.inputMap.has(inputWin.bufnr)) {
      Input.inputMap.set(inputWin.bufnr, {
        input: this,
        instance,
        inputWin,
      });
    }
    this.disposables.push(
      Disposable.create(() => {
        this.completionDisposable?.dispose();
      }),
    );
    return instance;
  }

  protected async _opened(instance: Instance): Promise<boolean> {
    return instance.opened();
  }

  async textChange(mode: MapMode) {
    if (!this.storeOptions) {
      return;
    }
    const instance = await this.instance();
    await instance.resize(
      await this.getFinalOpenOptions(
        this.storeOptions,
        instance,
        'resize',
        mode,
      ),
    );
  }

  protected async getFinalOpenOptions(
    options: Input.Options,
    instance: Instance,
    type: 'open' | 'resize',
    mode: MapMode = 'n',
  ): Promise<MultiFloatingWindow.OpenOptions> {
    const targetMode = workspace.env.mode as MapMode;

    const width = options.width ?? 30;
    let inputTop = 0;
    const finalOptions: MultiFloatingWindow.OpenOptions = {
      relative: options.relative ?? 'center',
      title: options.title,
      border: options.border === false ? undefined : [],
      wins: {},
    };
    if (options.prompt) {
      const promptLines = options.prompt.split(/\r\n|[\n\r]/g);
      const promptHeight = await displayHeight(width, promptLines);
      finalOptions.wins.prompt = {
        width,
        height: promptHeight,
        focusable: false,
        lines: promptLines,
        highlights: promptLines.map((_, line) => ({
          line,
          colStart: 0,
          colEnd: -1,
          hlGroup: 'Question',
        })),
      };
      inputTop = promptHeight;
    }

    let inputLines: string[];
    let inputHeight: number;
    if (type === 'open') {
      inputLines = [
        options.defaultValue
          ? await this.valueToString(options.defaultValue)
          : await this.defaultString(),
      ];
      inputHeight = await displayHeight(width, inputLines);
    } else {
      const inputWin = instance.floatWinDict.input;
      inputLines = await inputWin.buffer.getLines();
      const win = await inputWin.win();
      if (win) {
        const cursor = await win.cursor;
        inputHeight = await displayHeight(width, inputLines, cursor, mode);
      } else {
        inputHeight = await displayHeight(width, inputLines);
      }
    }

    finalOptions.wins.input = {
      top: inputTop,
      width,
      height: inputHeight || 1,
      focus: true,
      modifiable: true,
      lines: inputLines,
      initedExecute: (ctx) => `
        call setbufvar(${ctx.bufnr}, '&buftype', '')
        call setbufvar(${ctx.bufnr}, '&wrap', 1)
        execute 'nmap <silent><buffer> <CR> :call CocAction("runCommand", "${Input.actionCmd}", "ok", ' . ${ctx.bufnr} . ', "n", "${targetMode}")<CR>'
        execute 'imap <silent><buffer> <CR> <C-o>:call CocAction("runCommand", "${Input.actionCmd}", "ok", ' . ${ctx.bufnr} . ', "i", "${targetMode}")<CR>'
        execute 'nmap <silent><buffer> <ESC> :call CocAction("runCommand", "${Input.actionCmd}", "cancel", ' . ${ctx.bufnr} . ', "n", "${targetMode}")<CR>'
        execute 'imap <silent><buffer> <C-c> <C-o>:call CocAction("runCommand", "${Input.actionCmd}", "cancel", ' . ${ctx.bufnr} . ', "i", "${targetMode}")<CR>'
        call feedkeys('A')
      `,
    };

    if (options.completion) {
      if (this.completionDisposable) {
        this.completionDisposable.dispose();
      }
      const filetype = options.filetype ?? this.genFiletype();
      this.completionDisposable = languages.registerCompletionItemProvider(
        filetype,
        options.completion.short,
        [filetype],
        options.completion.provider,
      );
    }

    return finalOptions;
  }

  protected async _open(instance: Instance, options: Input.Options) {
    await instance.open(
      await this.getFinalOpenOptions(options, instance, 'open'),
    );
  }

  protected async _resize(instance: Instance, options: Input.Options) {
    await instance.resize(
      await this.getFinalOpenOptions(options, instance, 'resize'),
    );
  }

  protected async _close(instance: Instance) {
    await instance.close();
  }

  protected async defaultString(): Promise<string> {
    return '';
  }

  protected async valueToString(value: string): Promise<string> {
    return value;
  }

  protected async stringToValue(str: string): Promise<string> {
    return str;
  }

  protected async validateContent(_str: string): Promise<boolean> {
    return true;
  }
}
