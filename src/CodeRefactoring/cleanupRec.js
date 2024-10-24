const { getALFiles, getDocumentErrors, getTextDocumentFromFilePath, getOpenedALDocuments, writeAndSaveDocument, getFileContent } = require('../ProjectWorkspaceManagement/workspaceMgt.js');

module.exports.cleanupRecReference = async function () {
    let customALpages = await getALFiles('src/Custom/Pages');
    let ALpageext = await getALFiles('src/Standard/PageExtensions');
    if (!customALpages && !ALpageext) return;
    let ALfiles = customALpages.concat(ALpageext);

    if (ALfiles.length === 0)
        return 'No AL page or page extension objects found in the src directory.';

    // Declare when any files have been changed
    let changed = false;
    // Go through every page and pageextension AL file
    for (const file of ALfiles) {
        // Get AL file document
        const document = await getTextDocumentFromFilePath(file);
        if (document) {
            // Read file content into text
            const fileContent = await getFileContent(file);
            // Remove Rec reference mistakenly added into inappropriate place
            const updatedContent = await removeRecReferenceCausingAnError(document, fileContent);
            if (updatedContent !== fileContent) {
                // Write the updated content back to the file
                await writeAndSaveDocument(document, updatedContent);
                // Declare file modification
                changed = true;
            }
        }
    }
    // Recommends to run command again when some content was changed and could have more errors
    if (changed)
        return 'Please run this command again after few seconds!';
    return 'Record reference cleaned up.';
}


module.exports.cleanupRecReferenceInActiveFiles = async function () {
    const ALdocs = getOpenedALDocuments();
    if (!ALdocs) return;
    if (ALdocs.length === 0)
        return 'No AL files are opened in the workspace.';

    // Declare when any files have been changed
    let changed = false;
    // Go through every page and pageextension AL file
    for (const document of ALdocs) {
        // Read file content into text
        const fileContent = document.getText();
        // Modify only page or pageextension type objects
        if (fileContent.startsWith('page ') || fileContent.startsWith('pageextension ')) {
            // Remove Rec reference mistakenly added into inappropriate place
            const updatedContent = await removeRecReferenceCausingAnError(document, fileContent);
            if (updatedContent !== fileContent) {
                // Write the updated content back to the file
                await writeAndSaveDocument(document, updatedContent);
                // Declare file modification
                changed = true;
            }
        }
    }
    // Recommends to run command again when some content was changed and could have more errors
    if (changed)
        return 'Please run this command again after few seconds!';
    return 'Record reference cleaned up.';
}


/**
 * Remove Rec reference from fields and procedures from pages an pageextensions where it is causing an error
 * @param {string} content
 * @param {import("vscode").TextDocument} document
 */
async function removeRecReferenceCausingAnError(document, content) {
    try {
        let errors = [];
        errors.push("The name 'Rec' does not exist in the current context.");
        errors.push('does not contain a definition for ');
        errors.push(' must be a member');

        // Get all document errors associated with missing Rec reference
        const diagnostics = await getDocumentErrors(document, errors);
        // Return original content when no errors found
        if (diagnostics.length == 0)
            return content;
        let updatedContent = content;
        // Go through every error
        diagnostics.forEach(diagnostic => {
            // Get the start and end positions of the diagnostic
            const startPosition = diagnostic.range.start;
            const endPosition = diagnostic.range.end;
            // Get the content of the line from the document
            const errorLine = document.lineAt(startPosition.line).text;
            // Extract the exact substring that caused the error based on the range
            const errorSnippet = errorLine.substring(startPosition.character, endPosition.character);
            let updatedLine = errorLine;
            if (errorSnippet == 'Rec') {
                updatedLine = `${errorLine.slice(0, startPosition.character)}${errorLine.slice(endPosition.character + 1)}`;
            } else if (errorSnippet.startsWith('Rec.')) {
                updatedLine = `${errorLine.slice(0, startPosition.character)}${errorSnippet.slice(4)}${errorLine.slice(endPosition.character)}`;
            }
            else if (errorLine.slice(startPosition.character - 4, startPosition.character) == 'Rec.') {
                updatedLine = `${errorLine.slice(0, startPosition.character - 4)}${errorSnippet}${errorLine.slice(endPosition.character)}`;
            }
            // Replace the content of the first error line with the modified text
            updatedContent = updatedContent.replace(errorLine, updatedLine);

        });
        return updatedContent;
    }
    catch (error) {
        console.error(`Error modifying file: ${error}`);
        return content;
    }
}
