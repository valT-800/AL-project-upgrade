const { getALFiles, writeAndSaveFile, getDocumentErrors, getTextDocumentFromFilePath, getFileContent, getOpenedALDocuments, writeAndSaveDocument } = require('../ProjectWorkspaceManagement/workspaceMgt');

module.exports.addRecReference = async function () {

    const customALpages = await getALFiles('src/Custom/Pages');
    const ALpageext = await getALFiles('src/Standard/PageExtensions');
    if (!customALpages && !ALpageext) return;
    const ALfiles = customALpages.concat(ALpageext);

    if (ALfiles.length === 0)
        return 'No AL page or page extension objects found in the src directory.';

    // Declare when any files have been changed
    let changed = false;

    // Go through every page and pageextension AL file
    for (const file of ALfiles) {
        // Read file content into text
        const fileContent = await getFileContent(file);
        // Get AL file document
        const document = await getTextDocumentFromFilePath(file);
        // Add Rec reference
        const updatedContent = await addRecReferenceInCode(document, fileContent);
        if (updatedContent !== fileContent) {
            // Write the updated content back to the file
            await writeAndSaveFile(file, updatedContent);
            // Declare file modification
            changed = true;
        }
    }
    if (changed)
        return 'Please run this command again after few seconds!';
    return ('Rec reference added');
}

module.exports.addRecReferenceInActiveFiles = async function () {

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
        // Add Rec reference
        const updatedContent = await addRecReferenceInCode(document, fileContent);
        if (updatedContent !== fileContent) {
            // Write the updated content back to the file
            await writeAndSaveDocument(document, updatedContent);
            // Declare file modification
            changed = true;
        }
    }
    if (changed)
        return 'Please run this command again after few seconds!';
    return ('Rec reference added');
}

/**
 * Add Rec reference to fields and procedures causing a warning or error
 * @param {import("vscode").TextDocument} document
 * @param {string} content
 */
async function addRecReferenceInCode(document, content) {
    try {
        const warnings = ["Use of implicit 'with' will be removed in the future. Qualify with 'Rec'. This warning will become an error in a future release."];

        // Get all document warnings of missing Rec reference
        let diagnostics = await getDocumentErrors(document, warnings);
        // When no warnings found get errors associated with missing Rec reference
        if (diagnostics.length == 0) {
            const errors = ['does not exist in the current context'];
            diagnostics = await getDocumentErrors(document, errors);
            // Return original content when no warnings or errors found
            if (diagnostics.length == 0)
                return content;
        }
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

            // Add Rec reference when there is no Rec reference added
            if (errorLine.substring(startPosition.character - 4, endPosition.character) !== `Rec.${errorSnippet}` && !errorSnippet.includes('Rec.') && errorSnippet != 'Rec') {
                // Regex for fields going after some common characters
                let pattern = /(=\s*|if\s*)("[^"]+"|\w+)/gi;
                errorLine.replace(pattern, (match, beforeCh, field) => {
                    if (errorSnippet == field) {
                        // Slice the error line content and add Rec reference before error causer
                        updatedLine = `${errorLine.slice(0, startPosition.character)}Rec.${errorSnippet}${errorLine.slice(endPosition.character)}`;
                    }
                    return match;
                });
                // Regex for fields and procedures followed by some common characters
                pattern = /("[^"]+"|\w+)(\s*;|\s*,|\s*\(|\s*\)|\s*:|\s*=|\s*<|\s*>|\s*:=|\s*\+|\s*\-|\s*\/|\s+then)/gi;
                errorLine.replace(pattern, (match, fieldOrProcedure) => {
                    if (errorSnippet == fieldOrProcedure) {
                        // Slice the error line content and add Rec reference before error causer
                        updatedLine = `${errorLine.slice(0, startPosition.character)}Rec.${errorSnippet}${errorLine.slice(endPosition.character)}`;
                    }
                    return match;
                });
            }
            // Replace the content of the first error line with the modified text
            updatedContent = updatedContent.replace(errorLine, updatedLine);

        });
        return updatedContent;
    }
    catch (error) {
        console.error(`Error adding Record reference to file: ${error}`);
        return content;
    }
}
