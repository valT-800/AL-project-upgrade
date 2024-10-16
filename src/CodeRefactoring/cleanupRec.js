const { getALFiles, writeAndSaveFile, getDocumentErrors, getFileContent, getTextDocumentFromFilePath } = require('../ProjectWorkspaceManagement/workspaceMgt.js');

module.exports.cleanupRecReference = async function () {
    let customALpages = await getALFiles('src/Custom/Pages');
    let ALpageext = await getALFiles('src/Standard/PageExtensions');
    let ALfiles = customALpages.concat(ALpageext);

    if (ALfiles.length === 0)
        return 'No AL page or page extension objects found in the src directory.';

    // Declare when any files have been changed
    let changed = false;
    // Go through every page and pageextension AL file
    for (const file of ALfiles) {
        const fileContent = await getFileContent(file);
        const updatedContent = await removeRecReferenceCausingAnError(file, fileContent);
        if (updatedContent !== fileContent) {
            // Write the updated content back to the file
            await writeAndSaveFile(file, updatedContent);
            // Declare file modification
            changed = true;
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
 * @param {string} file
 */
async function removeRecReferenceCausingAnError(file, content) {
    try {
        let errors = [];
        errors.push("The name 'Rec' does not exist in the current context.");
        errors.push('does not contain a definition for ');
        errors.push(' must be a member');
        // Get AL file document
        const document = await getTextDocumentFromFilePath(file);
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
            } else if (errorLine.slice(startPosition.character - 4, startPosition.character) == 'Rec.') {
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
