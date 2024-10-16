// The module 'vscode' contains the VS Code extensibility API

// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');

const { addSufix2, addSufix1 } = require('./src/ProjectPreparation/addSufix');
const { addPrefix1, addPrefix2 } = require('./src/ProjectPreparation/addPrefix');
const { addRecReference } = require('./src/CodeRefactoring/addRec.js');
const { addApplicationArea } = require('./src/ProjectPreparation/addApplicationArea');
const { renameALExtensions } = require('./src/ProjectPreparation/renameExtensions');
const { generalRefactoring } = require('./src/CodeRefactoring/generalRefactoring');
const { cleanupRecReference } = require('./src/CodeRefactoring/cleanupRec');
const { cleanupPrefix } = require('./src/ProjectPreparation/cleanupPrefix');
const { cleanupSufix } = require('./src/ProjectPreparation/cleanupSufix');

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "project-upgrade" is now active!');

	const addRecCommand = vscode.commands.registerCommand('extension.addRecReference', async function () {
		await vscode.commands.executeCommand('workbench.action.closeAllGroups');
		vscode.window.showInformationMessage(await addRecReference());
	});
	const cleanupRecCommand = vscode.commands.registerCommand('extension.cleanupRecReference', async function () {
		await vscode.commands.executeCommand('workbench.action.closeAllGroups');
		vscode.window.showInformationMessage(await cleanupRecReference());
	});

	let sufix = '';
	let prefix = '';

	const addApplicationAreaCommand = vscode.commands.registerCommand('extension.addApplicationAreaAll', async function () {
		await vscode.commands.executeCommand('workbench.action.closeAllGroups');
		vscode.window.showInformationMessage(await addApplicationArea());
	});
	const addSufix1Command = vscode.commands.registerCommand('extension.addSufix1', async function () {
		await vscode.commands.executeCommand('workbench.action.closeAllGroups');

		sufix = await vscode.window.showInputBox({ prompt: 'Enter the sufix to add' });
		if (!sufix) {
			vscode.window.showErrorMessage('No sufix provided.');
			sufix = '';
			return;
		}
		vscode.window.showInformationMessage(await addSufix1(sufix));
	});
	const addSufix2Command = vscode.commands.registerCommand('extension.addSufix2', async function () {
		await vscode.commands.executeCommand('workbench.action.closeAllGroups');

		if (sufix == '') {
			vscode.window.showErrorMessage('No sufix provided. Please run step 1 first!');
			return;
		}
		vscode.window.showInformationMessage(await addSufix2(sufix));
	});
	const addSufix3Command = vscode.commands.registerCommand('extension.addSufix3', async function () {
		await vscode.commands.executeCommand('workbench.action.closeAllGroups');

		if (sufix == '') {
			vscode.window.showErrorMessage('No sufix provided. Please run step 1 first!');
			return;
		}
		vscode.window.showInformationMessage(await cleanupSufix(sufix));
	});

	const addPrefix1Command = vscode.commands.registerCommand('extension.addPrefix1', async function () {
		await vscode.commands.executeCommand('workbench.action.closeAllGroups');
		prefix = await vscode.window.showInputBox({ prompt: 'Enter the prefix to add' });
		if (!prefix) {
			vscode.window.showErrorMessage('No prefix provided.');
			prefix = '';
			return;
		}
		vscode.window.showInformationMessage(await addPrefix1(prefix));
	});
	const addPrefix2Command = vscode.commands.registerCommand('extension.addPrefix2', async function () {
		await vscode.commands.executeCommand('workbench.action.closeAllGroups');

		if (prefix == '') {
			vscode.window.showErrorMessage('No prefix provided. Please run step 1 first!');
			return;
		}
		vscode.window.showInformationMessage(await addPrefix2(prefix));
	});
	const addPrefix3Command = vscode.commands.registerCommand('extension.addPrefix3', async function () {
		await vscode.commands.executeCommand('workbench.action.closeAllGroups');

		if (prefix == '') {
			vscode.window.showErrorMessage('No prefix provided. Please run step 1 first!');
			return;
		}
		vscode.window.showInformationMessage(await cleanupPrefix(prefix));
	});

	const renameExtensionsCommand = vscode.commands.registerCommand('extension.renameExtensions', async function () {
		await vscode.commands.executeCommand('workbench.action.closeAllGroups');

		// Get the afix manually from user
		const provideAfix = async () => {
			const answer = await vscode.window.showInformationMessage('Does objects have a prefix or sufix already added?', 'No', 'Yes');
			if (answer == 'Yes') {
				const afix = await vscode.window.showInputBox({ prompt: 'Enter the afix to add' });
				if (!afix) {
					provideAfix();
				}
				return afix;
			}
			return '';
		}

		let afix = '';
		if (sufix != '') afix = sufix;
		else if (prefix != '') afix = prefix;
		else afix = await provideAfix(); //if no sufix or prefix where added with extension get the afix from user

		vscode.window.showInformationMessage(await renameALExtensions(afix));
	});
	const generalRefactoringCommand = vscode.commands.registerCommand('extension.generalRefactoring', async function () {
		await vscode.commands.executeCommand('workbench.action.closeAllGroups');
		vscode.window.showInformationMessage(await generalRefactoring());
	});

	context.subscriptions.push(addApplicationAreaCommand);
	context.subscriptions.push(addRecCommand);
	context.subscriptions.push(cleanupRecCommand);
	context.subscriptions.push(addSufix1Command);
	context.subscriptions.push(addSufix2Command);
	context.subscriptions.push(addSufix3Command);
	context.subscriptions.push(addPrefix1Command);
	context.subscriptions.push(addPrefix2Command);
	context.subscriptions.push(addPrefix3Command);
	context.subscriptions.push(renameExtensionsCommand);
	context.subscriptions.push(generalRefactoringCommand);
}

// This method is called when your extension is deactivated
function deactivate() { }

module.exports = {
	activate,
	deactivate
}

