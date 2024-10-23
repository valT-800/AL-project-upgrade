// The module 'vscode' contains the VS Code extensibility API

// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');

const { addSufix2, addSufix1 } = require('./src/ProjectPreparation/addSufix');
const { addPrefix1, addPrefix2 } = require('./src/ProjectPreparation/addPrefix');
const { addRecReference, addRecReferenceInActiveFiles } = require('./src/CodeRefactoring/addRec.js');
const { addApplicationArea } = require('./src/ProjectPreparation/addApplicationArea');
const { renameALExtensions } = require('./src/ProjectPreparation/renameExtensions');
const { generalRefactoring, generalRefactoringInActiveFiles } = require('./src/CodeRefactoring/generalRefactoring');
const { cleanupRecReference, cleanupRecReferenceInActiveFiles } = require('./src/CodeRefactoring/cleanupRec');
const { cleanupPrefix } = require('./src/ProjectPreparation/cleanupPrefix');
const { cleanupSufix } = require('./src/ProjectPreparation/cleanupSufix');
const { changeReportsLayoutPath } = require('./src/ProjectPreparation/changeReportLayoutsPath');
const { structurizeProject } = require('./src/ProjectPreparation/structurizeProject');

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Declare global afix values to remember it when running different commands
	let sufix = '';
	let prefix = '';

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
	const addRecInActiveFilesCommand = vscode.commands.registerCommand('extension.addRecReferenceInActiveFiles', async function () {
		vscode.window.showInformationMessage(await addRecReferenceInActiveFiles());
	});
	const cleanupRecInActiveFilesCommand = vscode.commands.registerCommand('extension.cleanupRecReferenceInActiveFiles', async function () {
		vscode.window.showInformationMessage(await cleanupRecReferenceInActiveFiles());
	});

	const projectPrepCommand = vscode.commands.registerCommand('extension.projectPrep', async function () {
		await vscode.commands.executeCommand('workbench.action.closeAllGroups');
		vscode.window.showInformationMessage(await structurizeProject());
		vscode.window.showInformationMessage(await addApplicationArea());
		vscode.window.showInformationMessage(await changeReportsLayoutPath());

		const provideAfix = async (/** @type {string} */ afix) => {
			let message = 'Does objects have an afix already added?';
			if (afix !== '') {
				const confirmAfix = await vscode.window.showInformationMessage(`Confirm saved afix - ${afix}`, 'Confirm', 'Decline');
				if (confirmAfix == 'Confirm') return afix;
				else message = 'Does objects have another afix already added?';
			}
			// Know afix value from user
			const answer = await vscode.window.showInformationMessage(message, 'No', 'Yes');
			if (answer == 'Yes') {
				const afix = await vscode.window.showInputBox({ prompt: 'Enter the afix to add' });
				if (!afix) {
					// Repeat function when afix should've been provided but wasn't
					provideAfix();
				}
				return afix;
			}
			return '';
		}

		// Get afix from the saved sufix and prefix values
		let afix = '';
		if (sufix != '') afix = sufix;
		else if (prefix != '') afix = prefix;
		// Confirm afix saved by the system or get the afix from user
		afix = await provideAfix(afix);

		// Know from user if extension market should be added to extension objects name
		const answer = await vscode.window.showInformationMessage('Do you want to add extension marker to an extension objects names?', 'No', 'Yes');
		let addExtMarker = false;
		if (answer == 'Yes') addExtMarker = true;

		vscode.window.showInformationMessage(await renameALExtensions(afix, addExtMarker));
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
		prefix = '';
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
		sufix = '';
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

	const generalRefactoringCommand = vscode.commands.registerCommand('extension.generalRefactoring', async function () {
		await vscode.commands.executeCommand('workbench.action.closeAllGroups');
		vscode.window.showInformationMessage(await generalRefactoring());
	});
	const generalActiveRefactoringCommand = vscode.commands.registerCommand('extension.generalActiveRefactoring', async function () {
		vscode.window.showInformationMessage(await generalRefactoringInActiveFiles());
	});

	context.subscriptions.push(projectPrepCommand);
	context.subscriptions.push(addRecCommand);
	context.subscriptions.push(cleanupRecCommand);
	context.subscriptions.push(addRecInActiveFilesCommand);
	context.subscriptions.push(cleanupRecInActiveFilesCommand);
	context.subscriptions.push(addSufix1Command);
	context.subscriptions.push(addSufix2Command);
	context.subscriptions.push(addSufix3Command);
	context.subscriptions.push(addPrefix1Command);
	context.subscriptions.push(addPrefix2Command);
	context.subscriptions.push(addPrefix3Command);
	context.subscriptions.push(generalRefactoringCommand);
	context.subscriptions.push(generalActiveRefactoringCommand);
}

// This method is called when your extension is deactivated
function deactivate() { }

module.exports = {
	activate,
	deactivate
}

