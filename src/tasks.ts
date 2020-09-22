import {
	workspace,
	ListAction,
	ListContext,
	ListItem,
	Neovim,
	BasicList,
	Uri
} from 'coc.nvim'
import Asynctasks from './asynctasks'


export default class Tasks extends BasicList {
	public readonly name = 'tasks'
	public readonly description = 'CocList for asynctasks.vim'
	public readonly defaultAction = 'run'
	public actions: ListAction[] = []
	ins: Asynctasks

	constructor(nvim: Neovim) {
		super(nvim)
		this.ins = Asynctasks.getInstance()

		this.addLocationActions()
		this.addAction('run', (item: ListItem) => {
			this.nvim.command(`AsyncTask ${item.data.name}`, true)
		})
	}

	public async loadItems(_context: ListContext): Promise<ListItem[]> {
		const source: ListItem[] = []
		const tasks = await this.ins.LoadItems(this.nvim)
		for (const task of tasks) {
			if (/^\./.test(task.name)) continue
			source.push({
				label: `${task.name.padEnd(25)}` + `<${task.scope}>`.padEnd(10) + `:  ${task.command}`,
				data: task,
				filterText: task.name,
				location: Uri.file(task.source).toString()
			})
		}
		return source
	}

	public doHighlight(): void {
		let {nvim} = workspace
		nvim.pauseNotification()
		nvim.command('syntax match TaskName /^\\S\\+/', true)
		nvim.command('hi def link TaskName Constant', true)
		nvim.command('syn match TaskScope /\\s\\+<.*>\\s\\+:/', true)
		nvim.command('hi def link TaskScope Type', true)
		nvim.command('syn match TaskCommand /.*/ contains=TaskName,TaskScope', true)
		nvim.command('hi def link TaskCommand Comment', true)
		nvim.resumeNotification().catch(_e => {
			// nop
		})
	}
}
