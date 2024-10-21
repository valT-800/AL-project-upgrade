const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

/** 
 * Get full file path on the local computer
 * @param {string} file - file path in the project
 */
module.exports.getFullFilePath = function (file) {
    const workspaceFolders = vscode.workspace.workspaceFolders; // opened project folders
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('No workspace folder is open!');
        return;
    }
    // Combine root project folder path with file path provided
    const filePath = path.join(workspaceFolders[0].uri.fsPath, file);
    return filePath;
}

/**
 * Get all AL files from the src directory and its subdirectories
 * @param {string} directory
 */
module.exports.getALFiles = async function (directory) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('No workspace folder is open!');
        return;
    }
    // Combine root project folder path with directory provided
    const srcFolderPath = path.join(workspaceFolders[0].uri.fsPath, directory);

    try {
        const alFiles = await collectFiles(srcFolderPath);
        return alFiles;
    } catch (error) {
        vscode.window.showErrorMessage(`Error reading src folder: ${error.message}`);
    }
}

module.exports.collectALFiles = async function (/** @type {string} */ directory) {
    await collectFiles(directory);
}

/**
 * Collect all AL files recursively
 * @param {string} directory
 */
async function collectFiles(directory) {
    let alFiles = [];

    // Read the directory contents
    const dirents = await fs.promises.readdir(directory, { withFileTypes: true });

    for (const dirent of dirents) {
        const fullPath = path.join(directory, dirent.name);

        if (dirent.isDirectory()) {
            // Recursively collect AL files from subdirectories
            const subDirFiles = await collectFiles(fullPath);
            alFiles = alFiles.concat(subDirFiles);
        } else if (dirent.isFile() && fullPath.endsWith('.al')) {
            // Add the AL file to the list
            alFiles.push(fullPath);
        }
    }

    return alFiles;
}

/**
 * Write updated content to a file
 * @param {string | fs.PathOrFileDescriptor} filePath
 * @param {string | NodeJS.ArrayBufferView} content - new file content
 */
module.exports.writeFile = function (filePath, content) {
    return new Promise((resolve, reject) => {
        fs.writeFile(filePath, content, 'utf8', (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

/**
 * Open file, write updated content with an editor and save the document
 * @param {string} filePath
 * @param {string} content - new file content
 */
module.exports.writeAndSaveFile = async function (filePath, content) {
    try {
        // Convert the file path to a URI
        const fileUri = vscode.Uri.file(filePath);
        // Open the text document using the URI
        const document = await vscode.workspace.openTextDocument(fileUri);
        const editor = await vscode.window.showTextDocument(document);
        await editor.edit(editBuilder => {
            const lastLine = document.lineCount - 1;
            const lastCharacter = document.lineAt(lastLine).text.length;
            editBuilder.replace(new vscode.Range(0, 0, lastLine, lastCharacter), content);
        });
        // Save the file after modification
        if (document.isDirty) {
            await document.save();
        }
    } catch (error) {
        console.error(`Error saving document: ${error}`);
        return undefined;
    }
}

module.exports.getTextDocumentFromFilePath = async function (/** @type {string} */ filePath) {
    try {
        // Convert the file path to a URI
        const fileUri = vscode.Uri.file(filePath);

        // Open the text document using the URI
        const document = await vscode.workspace.openTextDocument(fileUri);

        // Return the TextDocument
        return document;
    } catch (error) {
        console.error(`Error opening document: ${error}`);
        return undefined;
    }
}

module.exports.getFileContent = async function (/** @type {string} */ filePath) {
    try {
        // Convert the file path to a URI
        const fileUri = vscode.Uri.file(filePath);

        // Open the text document using the URI
        const document = await vscode.workspace.openTextDocument(fileUri);

        // Return the TextDocument
        return document.getText();
    } catch (error) {
        console.error(`Error opening document: ${error}`);
        return undefined;
    }
}

module.exports.saveDocument = async function (/** @type {string} */ filePath) {
    try {
        const document = await this.getTextDocumentFromFilePath(filePath);
        const saved = await document.save();
        return saved;
    } catch (error) {
        console.error(`Error saving document: ${error}`);
        return undefined;
    }
}

module.exports.getFileErrors = async function (/** @type {string} */ filePath,/** @type {string[]} */ errors) {
    try {
        const document = await this.getTextDocumentFromFilePath(filePath);
        if (document.languageId !== 'al') {
            return;
        }

        // Fetch existing diagnostics for this document
        const diagnostics = vscode.languages.getDiagnostics(document.uri);

        let filteredDiagnostics = [];

        // Filter diagnostics that has any of provided errors messages
        errors.forEach(error => {
            diagnostics.filter(diag => {
                if (diag.message.includes(error)) {
                    filteredDiagnostics.push(diag);
                }
            });
        });
        // Return the filtered diagnostics
        return filteredDiagnostics;
    } catch (error) {
        console.error(`Error opening document or getting diagnostics: ${error}`);
        return [];
    }
}

/**
 * Get AL document diagnostics matching provided errors messages
 * @param {vscode.TextDocument} document
 * @param {string[]} errors
 */
module.exports.getDocumentErrors = async function (document, errors) {
    try {
        if (document.languageId !== 'al') {
            return;
        }

        // Fetch existing diagnostics for this document
        const diagnostics = vscode.languages.getDiagnostics(document.uri);

        let filteredDiagnostics = [];

        // Filter diagnostics that has any of provided errors messages
        errors.forEach(error => {
            diagnostics.filter(diag => {
                if (diag.message.includes(error)) {
                    filteredDiagnostics.push(diag);
                }
            });
        });
        // Return the filtered diagnostics
        return filteredDiagnostics;
    } catch (error) {
        console.error(`Error opening document or getting diagnostics: ${error}`);
        return [];
    }
}