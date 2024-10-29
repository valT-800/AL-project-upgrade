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

		const provideSuffix = async (/** @type {string} */ suffix) => {
			if (suffix !== '') {
				const confirmSuffix = await vscode.window.showInformationMessage(`Confirm saved suffix - ${suffix}`, 'Confirm', 'Decline');
				if (confirmSuffix == 'Confirm') return suffix;
			}
			// Know suffix value from user
			suffix = await vscode.window.showInputBox({ prompt: 'Enter the suffix to add (example: "_SUFFIX")' });
			if (!suffix) {
				// Repeat function when suffix should've been provided but wasn't
				provideSuffix();
			}
			return suffix;
		}
		// Know prefix value from user
		const providePrefix = async (/** @type {string} */ prefix) => {
			if (prefix !== '') {
				const confirmPrefix = await vscode.window.showInformationMessage(`Confirm saved prefix - ${prefix}`, 'Confirm', 'Decline');
				if (confirmPrefix == 'Confirm') return prefix;
			}
			prefix = await vscode.window.showInputBox({ prompt: 'Enter the prefix to add (example: "PREFIX_")' });
			if (!prefix) {
				// Repeat function when prefix should've been provided but wasn't
				providePrefix();
			}
			return prefix;
		}

		// Know from user if extension market should be added to extension objects name
		const answerExtMarker = await vscode.window.showInformationMessage('Do you want to add extension marker to an extension objects names?', 'No', 'Yes');
		let addExtMarker = false;
		if (answerExtMarker == 'Yes') addExtMarker = true;

		const answerAffix = await vscode.window.showInformationMessage('Do you want to add prefix or suffix?', 'none', 'prefix', 'suffix');
		if (answerAffix == 'prefix') {
			let affix = await providePrefix(prefix);
			vscode.window.showInformationMessage(await renameALExtensions(affix, '', addExtMarker));
		}
		else if (answerAffix == 'suffix') {
			let affix = await provideSuffix(prefix);
			vscode.window.showInformationMessage(await renameALExtensions('', affix, addExtMarker));
		}
		else vscode.window.showInformationMessage(await renameALExtensions('', '', addExtMarker));

	});

	const addSuffix1Command = vscode.commands.registerCommand('extension.addSuffix1', async function () {
		await vscode.commands.executeCommand('workbench.action.closeAllGroups');

		suffix = await vscode.window.showInputBox({ prompt: 'Enter the suffix to add (example: "_SUFFIX")' });
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
		prefix = await vscode.window.showInputBox({ prompt: 'Enter the prefix to add (example: "PREFIX_")' });
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

