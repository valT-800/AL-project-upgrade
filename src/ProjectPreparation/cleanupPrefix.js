const { getALFiles, writeAndSaveFile, getDocumentErrors, getFileContent, getTextDocumentFromFilePath } = require('../ProjectWorkspaceManagement/workspaceMgt.js');

module.exports.cleanupPrefix = async function (/** @type {string} */ prefix) {
    const ALfiles = await getALFiles('src');
    if (!ALfiles) return;
    if (ALfiles.length === 0)
        return 'No AL files found in the src directory.';

    // Declare when any files have been changed
    let changed = false;
    // Go through every file
    for (const file of ALfiles) {
        const fileContent = await getFileContent(file);
        let updatedContent = await removePrefixCausingAnError(file, fileContent, prefix);
        if (updatedContent !== fileContent) {
            // Write the updated content back to the file
            await writeAndSaveFile(file, updatedContent);
            // Declare file modification
            changed = true;
        }
    }
    if (changed)
        return 'Please run this command again after few seconds!';
    return 'Prefix cleanup completed.';
}

// Helper function to add suffix to object names, fields, actions, and procedures
/**
 * @param {string} content
 * @param {string} file
 * @param {string} prefix
 */
async function removePrefixCausingAnError(file, content, prefix) {
    try {
        let errors = [];
        errors.push('does not contain a definition for');
        errors.push('does not exist');
        errors.push('is missing');
        errors.push('is not recognized as a valid type');
        errors.push('The source of a Column or Filter must be a field defined on the table referenced by its parent DataItem');
        errors.push('must be a member');
        const document = await getTextDocumentFromFilePath(file);
        const diagnostics = await getDocumentErrors(document, errors);
        // End function when no errors found
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
            // Remove prefix when from error causer
            if (errorSnippet.includes(`${prefix}`)) {
                let updatedSnippet = errorSnippet.replace(`${prefix}`, '');
                updatedLine = errorLine.replace(errorSnippet, updatedSnippet);
            }
            updatedContent = updatedContent.replace(errorLine, updatedLine);

        });
        return updatedContent;
    }
    catch (error) {
        console.error(`Error modifying file: ${error}`);
        return content;
    }
}
