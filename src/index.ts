import {commands, CompleteResult, ExtensionContext, listManager, sources, workspace} from 'coc.nvim';
import {activateHelper} from 'coc-helper';
import Tasks from './tasks'
import {Input} from './input'
import AsyncTasks from './command'
import {TaskProvider} from './provider'


export async function activate(context: ExtensionContext): Promise<void> {

	await activateHelper(context, {events: true, })
	const cmd = new AsyncTasks(workspace.nvim)
	const input = new Input()
	const task = new Tasks(workspace.nvim)
	context.subscriptions.push(
		commands.registerCommand('task.run', async () => {
			const content = await input.input({
				title: 'task',
				relative: 'center',
				filetype: 'asynctasks-task',
				completion: {
					short: "C",
					provider: new TaskProvider(workspace.nvim),
				}
			})
			if (!content) {
				return;
			}
			workspace.showMessage("-----------------"+ content.toString())	
			cmd.run(content.toString())
		}),
		commands.registerCommand("task.edit", async () => cmd.edit()),
		commands.registerCommand("task.edit.glob", async () => cmd.editglobal()),

		listManager.registerList(task),

		/* sources.createSource({ */
		/* 	name: 'coc-asynctasks completion source', // unique id */
		/* 	shortcut: '[CS]', // [CS] is custom source */
		/* 	priority: 1, */
		/* 	triggerPatterns: [], // RegExp pattern */
		/* 	doComplete: async () => { */
		/* 		const items = await getCompletionItems(); */
		/* 		return items; */
		/* 	}, */
		/* }), */

		/* workspace.registerKeymap( */
		/* 	['n'], */
		/* 	'coc-asynctasks-keymap', */
		/* 	async () => { */
		/* 		workspace.showMessage(`registerKeymap`); */
		/* 	}, */
		/* 	{sync: false} */
		/* ), */

		/* workspace.registerAutocmd({ */
		/* 	event: 'InsertLeave', */
		/* 	request: true, */
		/* 	callback: () => { */
		/* 		workspace.showMessage(`registerAutocmd on InsertLeave`); */
		/* 	}, */
		/* }) */
	);
}

async function getCompletionItems(): Promise<CompleteResult> {
	return {
		items: [
			{
				word: 'TestCompletionItem 1',
			},
			{
				word: 'TestCompletionItem 2',
			},
		],
	};
}
