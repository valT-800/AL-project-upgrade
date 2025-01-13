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
const { resolveScopeProperty } = require('./src/CodeRefactoring/resolveScopeProperty');

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

	const getOptions = async (/** @type {readonly vscode.QuickPickItem[] | { label: string; description: string; }[]} */ options,/** @type {string} */ title) => {
		return new Promise((resolve) => {

			const quickPick = vscode.window.createQuickPick();

			quickPick.items = options;
			quickPick.canSelectMany = true; // Allow multiple selections
			quickPick.title = title;

			// Show the quick pick
			quickPick.show();

			// Handle selection
			quickPick.onDidAccept(() => {
				const selectedItems = quickPick.selectedItems;
				if (selectedItems.length > 0) {
					const selectedLabels = selectedItems.map(item => item.label);
					resolve(selectedLabels);
				}
				else resolve([]);
				quickPick.hide(); // Close the Quick Pick UI
			});

			// Handle cancellation
			quickPick.onDidHide(() => {
				quickPick.dispose();
				resolve([]);
			});
		})
	}

	async function renameALExt() {
		let addExtMarker = false;
		let addPrefixToExtName = false;
		let addSuffixToExtName = false;
		let removeSpaces = false;

		// Set up options
		const options = [
			{ label: 'add Ext marker', description: 'Example: obj. name: "Customer List" => ext. name: "Customer List Ext"' },
			{ label: 'add prefix', description: 'Prefix goes before' },
			{ label: 'add suffix', description: 'Suffix goes after' },
			{ label: 'remove spaces', description: 'Example: obj. name: "Customer List" => ext. name: CustomerList' },
		];
		const selectedOptions = await getOptions(options, 'Select how to rename AL extensions');
		if (selectedOptions.length !== 0) {
			for (const index in selectedOptions) {
				if (selectedOptions[index] == 'add Ext marker')
					addExtMarker = true;
				else if (selectedOptions[index] == 'add prefix') addPrefixToExtName = true;
				else if (selectedOptions[index] == 'add suffix') addSuffixToExtName = true;
				else if (selectedOptions[index] == 'remove spaces') removeSpaces = true;
			};
			if (addPrefixToExtName) {
				let affix = await providePrefix(prefix);
				vscode.window.showInformationMessage(await renameALExtensions(affix, '', addExtMarker, removeSpaces));
			}
			else if (addSuffixToExtName) {
				let affix = await provideSuffix(suffix);
				vscode.window.showInformationMessage(await renameALExtensions('', affix, addExtMarker, removeSpaces));
			}
			else if (removeSpaces)
				vscode.window.showInformationMessage(await renameALExtensions('', '', addExtMarker, removeSpaces));
		}
	}
	const addApplicationAreaCommand = vscode.commands.registerCommand('extension.addApplicationArea', async function () {
		vscode.window.showInformationMessage(await addApplicationArea());
	});

	const projectPrepCommand = vscode.commands.registerCommand('extension.projectPrep', async function () {
		let structurizePrj = false;
		let addAppArea = false;
		let resolveScope = false;
		let renameExt = false;

		// Set up options
		const options = [
			{ label: 'structurize project files', description: 'structurizes all AL and report layout files by Simplanova template' },
			{ label: 'add Application Area All', description: 'Add ApplicationArea = All property' },
			{ label: 'resolve Scope', description: 'Resolve scope property depending on project target' },
			{ label: 'rename AL extensions', description: 'Rename AL extension objects' },
		];
		const selectedOptions = await getOptions(options);
		if (selectedOptions.length !== 0) {
			for (const index in selectedOptions) {
				if (selectedOptions[index] == 'structurize project files')
					structurizePrj = true;
				else if (selectedOptions[index] == 'add Application Area All') addAppArea = true;
				else if (selectedOptions[index] == 'resolve Scope') resolveScope = true;
				else if (selectedOptions[index] == 'rename AL extensions') renameExt = true;
			};
			if (structurizePrj) {
				vscode.window.showInformationMessage(await structurizeProject());
				vscode.window.showInformationMessage(await changeReportsLayoutPath());
			}
			else if (addAppArea)
				vscode.window.showInformationMessage(await addApplicationArea());
			else if (resolveScope)
				vscode.window.showInformationMessage(await resolveScopeProperty());
			else if (renameExt)
				await renameALExt();
		}
		vscode.window.showInformationMessage('Command completed!');
	});

	const addSuffix1Command = vscode.commands.registerCommand('extension.addSuffix1', async function () {
		await vscode.commands.executeCommand('workbench.action.closeAllGroups');

		suffix = await vscode.window.showInputBox({ prompt: 'Enter the suffix to add (example: "_SUFFIX")' });
		if (!suffix) {
			vscode.window.showErrorMessage('No suffix provided.');
			suffix = '';
			return;
		}
		const renameFilesAnswer = await vscode.window.showInformationMessage('Do you want to rename files?', 'No', 'Yes');
		let renameFiles = false;
		if (renameFilesAnswer == 'Yes') renameFiles = true;
		vscode.window.showInformationMessage(await addSuffix1(suffix, renameFiles));
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
		const renameFilesAnswer = await vscode.window.showInformationMessage('Do you want to rename files?', 'No', 'Yes');
		let renameFiles = false;
		if (renameFilesAnswer == 'Yes') renameFiles = true;
		vscode.window.showInformationMessage(await addPrefix1(prefix, renameFiles));
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
		vscode.window.showInformationMessage(await resolveScopeProperty());
		vscode.window.showInformationMessage(await generalRefactoring());
	});
	const generalActiveRefactoringCommand = vscode.commands.registerCommand('extension.generalActiveRefactoring', async function () {
		vscode.window.showInformationMessage(await resolveScopeProperty());
		vscode.window.showInformationMessage(await generalRefactoringInActiveFiles());
	});

	context.subscriptions.push(addApplicationAreaCommand);
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

