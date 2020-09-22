import {Neovim} from 'coc.nvim'
export default class Asynctasks {
	private static ins: Asynctasks
	private constructor() {}
	public static getInstance(): Asynctasks {
		if (!Asynctasks.ins) {
			Asynctasks.ins = new Asynctasks();
		}
		return Asynctasks.ins;
	}

	public async LoadItems(nvim: Neovim): Promise<TaskItem[]> {
		const loaded_asynctasks = await nvim.eval('exists("*asynctasks#list")')
		if (loaded_asynctasks.valueOf() == 0) return []
		return nvim.call('asynctasks#list', [''])
	}
}

export interface TaskItem {
	source: string,
	name: string,
	scope: string,
	command: string
}
