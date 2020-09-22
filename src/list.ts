import {
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

	completionKind: CompletionItemKind = CompletionItemKind.Method;

	async provideCompletionItems(
		document: TextDocument,
		position: Position,
	): Promise<CompletionItem[]> {
		const currentLine = document.getText(
			Range.create(Position.create(position.line, 0), position),
		);
		const list = await this.getList(currentLine);
		return list.map((l) => ({
			label: l.name,
			kind: l.kind ?? this.completionKind,
			insertText: l.name,
		}));
	}
}

export class TaskProvider extends ListProvider {
	constructor() {
		super();
	}
	async getList(prefix: string): Promise<ListItem[]> {
		const ins = AsyncTasks.getInstance()
		const ts = await ins.LoadItems(workspace.nvim)
		return ts.map((item)=>({
			name: item.name,
		}))
	}
}
