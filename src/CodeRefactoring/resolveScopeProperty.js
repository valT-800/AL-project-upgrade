const { getALFiles, writeFile, getTextDocumentFromFilePath, getFileContent, getFullFilePath } = require('../ProjectWorkspaceManagement/workspaceMgt.js');

module.exports.resolveScopeProperty = async function () {
    const ALfiles = await getALFiles('');
    if (!ALfiles) return;
    if (ALfiles.length === 0)
        return 'No AL files found in the workspace.';

    // Get project target from app.json file
    const appFilePath = await getFullFilePath('app.json');
    if (!appFilePath) return;
    const appFileContent = await getFileContent(appFilePath);
    if (!appFileContent) return 'No manifest file exists. Please add app.json file to continue!';
    const targetMatches = appFileContent.match(/(?<="target": )("\w+")/g);

    // Declare when any files have been changed
    let changed = false;

    // Go through every src directory AL file
    for (const file of ALfiles) {
        // Get AL file document
        const document = await getTextDocumentFromFilePath(file);
        if (document) {
            const fileContent = document.getText();
            let updatedContent = fileContent;
            if (targetMatches !== null) {
                updatedContent = resolveScopePropertyByProjectTarget(targetMatches[0], updatedContent);
            }
            if (updatedContent !== fileContent) {
                // Write the updated content back to the file
                await writeFile(file, updatedContent);
                // Declare file modification
                changed = true;
            }
        }
    }
    if (!changed) return;
    return 'Scope Property is resolved.';
}

/**
 * Refactor scope property based on project target
 * @param {string} target
 * @param {string} content
 */
function resolveScopePropertyByProjectTarget(target, content) {
    let updatedContent = content;
    if (target == '"Cloud"') {
        updatedContent = removeScopeInternalAndOnPrem(content);
    } else if (target == '"OnPrem"') {
        updatedContent = content.replaceAll("[Scope('Internal')]", "[Scope('OnPrem')]");
    }
    return updatedContent;
}

/**
 * Remove [Scope('Internal')] and [Scope('OnPrem')] procedure property
 * @param {string} content
 */
function removeScopeInternalAndOnPrem(content) {

    let targetString = "[Scope('Internal')]";
    // Split the content into an array of lines
    let lines = content.split('\n');
    // Filter out any line that contains the target string
    let filteredLines = lines.filter(line => !line.includes(targetString));
    targetString = "[Scope('OnPrem')]";
    filteredLines = filteredLines.filter(line => !line.includes(targetString));

    // Join the remaining lines back into a single string
    let updatedContent = filteredLines.join('\n');

    return updatedContent;
}