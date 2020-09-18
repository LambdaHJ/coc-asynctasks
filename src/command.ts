import {workspace, Neovim, FloatBuffer} from 'coc.nvim'
import {TaskInput} from './taskinput'

export default class AsyncTasks {

	constructor(private nvim: Neovim) {}

	public async run(taskname: string): Promise<void> {
		this.nvim.command(`AsyncTask ${taskname}`, true)
	}

	public async edit(): Promise<void> {
		this.nvim.command(`AsyncTaskEdit`, true)
	}

	public async editglobal(): Promise<void> {
		this.nvim.command(`AsyncTaskEdit!`, true)
	}
}
