import {
	Neovim,
	CompletionItemProvider,
	workspace,
	commands,
	languages,
	Document,
} from 'coc.nvim';
import {
	Position,
	TextDocument,
	Range,
	CompletionItem,
	CompletionItemKind,
	SymbolInformation,
	DocumentSymbol,
} from 'vscode-languageserver-protocol';
import AsyncTasks from './asynctasks';

type ListItem = {name: string; kind?: CompletionItemKind};

export abstract class ListProvider implements CompletionItemProvider {
	abstract getList(prefix: string): Promise<ListItem[]>;

	completionKind: CompletionItemKind = CompletionItemKind.EnumMember

	async provideCompletionItems(
		document: TextDocument,
		position: Position,
	): Promise<CompletionItem[]> {
		const currentLine = document.getText(
			Range.create(Position.create(position.line, 0), position),
		);
		workspace.showMessage("-----dddd-------" + currentLine)
		const list = await this.getList(currentLine);
		return list.map((l) => ({
			label: l.name,
			kind: l.kind ?? this.completionKind,
			insertText: l.name,
		}));
	}
}

export class TaskProvider extends ListProvider {
	ins: AsyncTasks;
	nvim: Neovim;
	constructor(nvim: Neovim) {
		super();
		workspace.showMessage("------------")
		this.ins = AsyncTasks.getInstance()
		this.nvim = nvim
	}
	async getList(prefix: string): Promise<ListItem[]> {
		const ts = await this.ins.LoadItems(this.nvim)
		workspace.showMessage("------------"+prefix)
		return ts.map((item) => ({
			name: item.name,
		})).filter((item) => item.name.startsWith(prefix))
	}
}
