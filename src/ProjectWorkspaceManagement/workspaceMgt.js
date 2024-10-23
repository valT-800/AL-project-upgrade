const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

/** 
 * Get full file path on the local computer
 * @param {string} file - file path in the project
 */
module.exports.getFullFilePath = async function (file) {
    const workspaceFolders = vscode.workspace.workspaceFolders; // opened project folders
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('No workspace folder is open!');
        return;
    }
    // Combine root project folder path with file path provided
    const filePath = path.join(workspaceFolders[0].uri.fsPath, file);
    // Check if such file exists
    const fileExist = await fileExists(filePath);
    if (!fileExist) return;
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
    const folderPath = path.join(workspaceFolders[0].uri.fsPath, directory);
    // Check if such folder exists
    const folderExist = await directoryExists(folderPath);
    if (!folderExist) return [];
    try {
        const alFiles = await collectALFiles(folderPath);
        return alFiles;
    } catch (error) {
        vscode.window.showErrorMessage(`Error reading src folder: ${error.message}`);
        return;
    }
}

module.exports.getAllFiles = async function () {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('No workspace folder is open!');
        return;
    }
    let files = [];
    // Read the directory contents
    const dirents = await fs.promises.readdir(workspaceFolders[0].uri.fsPath, { withFileTypes: true });
    for (const dirent of dirents) {
        const fullPath = path.join(workspaceFolders[0].uri.fsPath, dirent.name);
        if (dirent.isFile()) {
            // Add the AL file to the list
            files.push(fullPath);
        }
    }
    return files;
}

/**
 * Get all AL files from opened in workspace
 */
module.exports.getOpenedALDocuments = function () {
    try {
        let textDocuments = vscode.workspace.textDocuments;
        if (!textDocuments) {
            vscode.window.showErrorMessage('No workspace folder is open!');
            return;
        }
        if (textDocuments.length === 0) return [];
        else textDocuments = textDocuments.filter(doc => doc.languageId == 'al');
        return textDocuments;

    } catch (error) {
        vscode.window.showErrorMessage(`Error reading workspace files: ${error.message}`);
        return;
    }
}

module.exports.collectALFiles = async function (/** @type {string} */ directory) {
    await collectALFiles(directory);
}

/**
 * Collect all AL files recursively
 * @param {string} directory
 */
async function collectALFiles(directory) {
    let alFiles = [];

    // Read the directory contents
    const dirents = await fs.promises.readdir(directory, { withFileTypes: true });

    for (const dirent of dirents) {
        const fullPath = path.join(directory, dirent.name);

        if (dirent.isDirectory()) {
            // Recursively collect AL files from subdirectories
            const subDirFiles = await collectALFiles(fullPath);
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
    try {
        return new Promise((resolve, reject) => {
            fs.writeFile(filePath, content, 'utf8', (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    } catch (error) {
        vscode.window.showErrorMessage(`Error saving file: ${error}`);
        return;
    }
}

/**
 * Open file, write updated content with an editor and save the document
 * @param {string} filePath
 * @param {string} content - new file content
 */
module.exports.writeAndSaveFile = async function (filePath, content) {
    try {
        // Open and show text document
        const document = await getTextDocument(filePath);
        const editor = await vscode.window.showTextDocument(document);
        // Edit document content
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
        vscode.window.showErrorMessage(`Error saving document: ${error}`);
        return;
    }
}

/**
 * Write updated content with an editor and save the document
 * @param {vscode.TextDocument} document
 * @param {string} content - new text document content
 */
module.exports.writeAndSaveDocument = async function (document, content) {
    try {
        // Edit document content
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
        vscode.window.showErrorMessage(`Error saving document: ${error}`);
        return;
    }
}

module.exports.getTextDocumentFromFilePath = async function (/** @type {string} */ filePath) {
    return await getTextDocument(filePath);
}

/**
 * @param {string} file
 */
async function getTextDocument(file) {
    try {
        // Convert the file path to a URI
        const fileUri = vscode.Uri.file(file);
        // Check if such document exists
        const documentExist = await fileExists(file);
        if (!documentExist) return;
        // Open the text document using the URI
        const document = await vscode.workspace.openTextDocument(fileUri);

        // Return the TextDocument
        return document;
    } catch (error) {
        vscode.window.showErrorMessage(`Error opening document: ${error}`);
        return;
    }
}

module.exports.getFileContent = async function (/** @type {string} */ filePath) {
    try {
        // Open the text document
        const document = await getTextDocument(filePath);
        // Return the TextDocument
        return document.getText();
    } catch (error) {
        console.error(`Error getting file content: ${error}`);
        return '';
    }
}

module.exports.getFileErrors = async function (/** @type {string} */ filePath,/** @type {string[]} */ errors) {
    try {
        const document = await getTextDocument(filePath);
        if (document.languageId !== 'al') {
            return [];
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
            return [];
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
 * @param {string} file
 */
async function fileExists(file) {
    try {
        // Convert the file path to a URI
        const fileUri = vscode.Uri.file(file);
        // Try to stat the file
        const fileStat = await vscode.workspace.fs.stat(fileUri);
        // Check if the uri is the file
        if (fileStat.type === vscode.FileType.File)
            return true;
        else return false;
    } catch (error) {
        // If an error occurs, the file does not exist
        return false;
    }
}
/**
 * @param {string} directory
 */
async function directoryExists(directory) {
    try {
        // Convert the directory path to a URI
        const directoryUri = vscode.Uri.file(directory);
        // Try to stat the directory 
        const stat = await vscode.workspace.fs.stat(directoryUri);
        // Check if the uri is the directory
        if (stat.type === vscode.FileType.Directory)
            return true;
        else return false;
    } catch (error) {
        // If an error occurs, the directory does not exist
        return false;
    }
}
/**
 * @param {string} folder
 */
module.exports.folderExists = async function (folder) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('No workspace folder is open!');
        return;
    }
    // Combine root project folder path with directory provided
    const srcFolderPath = path.join(workspaceFolders[0].uri.fsPath, folder);
    return await directoryExists(srcFolderPath);
}

/**
 * @param {string} folder
 */
module.exports.createFolder = async function (folder) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('No workspace folder is open!');
        return;
    }
    try {
        // Combine root project folder path with directory provided
        const folderPath = path.join(workspaceFolders[0].uri.fsPath, folder);
        const folderUri = vscode.Uri.file(folderPath);

        vscode.workspace.fs.createDirectory(folderUri);
    } catch (error) {
        vscode.window.showErrorMessage(`Error creating folder: ${error}`);
        return;
    }
}

/**
 * @param {string} file
 */
module.exports.moveFile = async function (file, /** @type {string} */ targetDirectory) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('No workspace folder is open!');
        return;
    }
    // Specify the source file path and the target directory path
    const sourceFilePath = vscode.Uri.file(file);
    const fullTargetDirectory = path.join(workspaceFolders[0].uri.fsPath, targetDirectory);
    const targetDirectoryPath = vscode.Uri.file(fullTargetDirectory);

    // Construct the new destination file path by appending the file name to the target directory
    const targetFilePath = vscode.Uri.joinPath(targetDirectoryPath, path.basename(file));
    try {
        // Use the rename method to move the file
        await vscode.workspace.fs.rename(sourceFilePath, targetFilePath, { overwrite: false });
    } catch (error) {
        vscode.window.showErrorMessage('Error moving the file: ' + error);
    }
}