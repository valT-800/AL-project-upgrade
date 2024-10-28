// The module 'vscode' contains the VS Code extensibility API

// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');

const { addSuffix2, addSuffix1 } = require('./src/ProjectPreparation/addSuffix');
const { addPrefix1, addPrefix2 } = require('./src/ProjectPreparation/addPrefix');
const { addApplicationArea } = require('./src/ProjectPreparation/addApplicationArea');
const { renameALExtensions } = require('./src/ProjectPreparation/renameExtensions');
const { generalRefactoring, generalRefactoringInActiveFiles } = require('./src/CodeRefactoring/generalRefactoring');
const { cleanupPrefix } = require('./src/ProjectPreparation/cleanupPrefix');
const { cleanupSuffix } = require('./src/ProjectPreparation/cleanupSuffix');
const { changeReportsLayoutPath } = require('./src/ProjectPreparation/changeReportLayoutsPath');
const { structurizeProject } = require('./src/ProjectPreparation/structurizeProject');

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Declare global affix values to remember it when running different commands
	let suffix = '';
	let prefix = '';

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "project-upgrade" is now active!');

	const projectPrepCommand = vscode.commands.registerCommand('extension.projectPrep', async function () {
		await vscode.commands.executeCommand('workbench.action.closeAllGroups');
		vscode.window.showInformationMessage(await structurizeProject());
		vscode.window.showInformationMessage(await addApplicationArea());
		vscode.window.showInformationMessage(await changeReportsLayoutPath());

		const provideAffix = async (/** @type {string} */ affix) => {
			let message = 'Does objects have an affix already added?';
			if (affix !== '') {
				const confirmAffix = await vscode.window.showInformationMessage(`Confirm saved affix - ${affix}`, 'Confirm', 'Decline');
				if (confirmAffix == 'Confirm') return affix;
				else message = 'Does objects have another affix already added?';
			}
			// Know affix value from user
			const answer = await vscode.window.showInformationMessage(message, 'No', 'Yes');
			if (answer == 'Yes') {
				const affix = await vscode.window.showInputBox({ prompt: 'Enter the affix to add' });
				if (!affix) {
					// Repeat function when affix should've been provided but wasn't
					provideAffix();
				}
				return affix;
			}
			return '';
		}

		// Get affix from the saved suffix and prefix values
		let affix = '';
		if (suffix != '') affix = suffix;
		else if (prefix != '') affix = prefix;
		// Confirm affix saved by the system or get the affix from user
		affix = await provideAffix(affix);

		// Know from user if extension market should be added to extension objects name
		const answer = await vscode.window.showInformationMessage('Do you want to add extension marker to an extension objects names?', 'No', 'Yes');
		let addExtMarker = false;
		if (answer == 'Yes') addExtMarker = true;

		vscode.window.showInformationMessage(await renameALExtensions(affix, addExtMarker));
	});

	const addSuffix1Command = vscode.commands.registerCommand('extension.addSuffix1', async function () {
		await vscode.commands.executeCommand('workbench.action.closeAllGroups');

		suffix = await vscode.window.showInputBox({ prompt: 'Enter the suffix to add' });
		if (!suffix) {
			vscode.window.showErrorMessage('No suffix provided.');
			suffix = '';
			return;
		}
		vscode.window.showInformationMessage(await addSuffix1(suffix));
		prefix = '';
	});
	const addSuffix2Command = vscode.commands.registerCommand('extension.addSuffix2', async function () {
		await vscode.commands.executeCommand('workbench.action.closeAllGroups');

		if (suffix == '') {
			vscode.window.showErrorMessage('No suffix provided. Please run step 1 first!');
			return;
		}
		vscode.window.showInformationMessage(await addSuffix2(suffix));
	});
	const addSuffix3Command = vscode.commands.registerCommand('extension.addSuffix3', async function () {
		await vscode.commands.executeCommand('workbench.action.closeAllGroups');

		if (suffix == '') {
			vscode.window.showErrorMessage('No suffix provided. Please run step 1 first!');
			return;
		}
		vscode.window.showInformationMessage(await cleanupSuffix(suffix));
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
		suffix = '';
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
	context.subscriptions.push(addSuffix1Command);
	context.subscriptions.push(addSuffix2Command);
	context.subscriptions.push(addSuffix3Command);
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

