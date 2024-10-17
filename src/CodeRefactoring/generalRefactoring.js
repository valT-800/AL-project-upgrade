const { getALFiles, writeAndSaveFile, getTextDocumentFromFilePath, getDocumentErrors, getFileContent, getFullFilePath } = require('../ProjectWorkspaceManagement/workspaceMgt.js');

module.exports.generalRefactoring = async function () {
    const ALfiles = await getALFiles('src');

    if (ALfiles.length === 0)
        return 'No AL files found in the src directory.';

    // Get project target from app.json file
    const appFilePath = getFullFilePath('app.json');
    const appFileContent = await getFileContent(appFilePath);
    const targetMatches = appFileContent.match(/(?<="target": )("\w+")/g);

    // Declare when any files have been changed
    let changed = false;
    // Go through every src directory AL file
    for (const file of ALfiles) {
        const fileContent = await getFileContent(file);
        let updatedContent = fileContent;
        updatedContent = await refactorCrossReference(file, updatedContent);
        updatedContent = refactorGetLanguageID(updatedContent);
        updatedContent = refactorObjectTableReference(updatedContent);
        if (targetMatches !== null) {
            updatedContent = resolveScopeInternal(targetMatches[0], updatedContent);
        }
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
    return 'General refactoring completed.';
}

/**
 * Replace Cross-Reference with Item Reference
 * @param {string} file
 * @param {string} content
 */
async function refactorCrossReference(file, content) {
    try {
        const errors = [' is removed. Reason: Cross-Reference replaced by Item Reference feature.. Tag: 22.0.'];
        // Get AL file document
        const document = await getTextDocumentFromFilePath(file);
        // Get all document errors of removed Cross-Reference
        const diagnostics = await getDocumentErrors(document, errors);
        // Return original content when no errors found
        if (diagnostics.length == 0) {
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
            let errorSnippet = errorLine.substring(startPosition.character, endPosition.character);
            let updatedSnippet = errorSnippet;
            // Replace Cross-Reference with Item Reference
            if (errorSnippet == '"Unit of Measure (Cross Ref.)"')
                updatedSnippet = '"Item Reference Unit of Measure"';
            else
                updatedSnippet = errorSnippet.replace('Cross-', 'Item ');
            let updatedLine = `${errorLine.slice(0, startPosition.character)}${updatedSnippet}${errorLine.slice(endPosition.character)}`;
            // Replace the content of the first error line with the modified text
            updatedContent = updatedContent.replace(errorLine, updatedLine);

        });
        return updatedContent;
    } catch (error) {
        console.error(`Error refactoring Cross-Reference: ${error}`);
        return content;
    }
}

/**
 * Replace GetLanguageID procedure with Language codeunit's GetLanguageIdOrDefault procedure
 * @param {string} content
 */
function refactorGetLanguageID(content) {

    let pattern = /\w+.GetLanguageID\(/gi;
    let updatedContent = content.replaceAll(pattern, 'languageMgt.GetLanguageIdOrDefault(');
    if (updatedContent !== content) {
        pattern = /(\s+)\w+:\s*Record Language;/gi;
        // Add Language codeunit variable after used before Language record variable
        updatedContent = updatedContent.replace(pattern, (match, space) => {
            return `${match}${space}languageMgt: Codeunit Language;`;
        });
    }
    return updatedContent;
}

/**
 * Replace Object table with AllObjWithCaption and it's fields
 * @param {string} content
 */
function refactorObjectTableReference(content) {

    let objectTablePattern = /(TableRelation = Object;)|(Record Object;)|(Record 2000000001;)|((,)+Object(\.)+)|((\()+Object(\.)+)|((; ")+Object("\))+)|((; )+Object(\))+)|(TableRelation = Object.)|(Record "Object")|(SourceTable = "Object";)|(SourceTable = Object;)/gi;
    objectTablePattern = /\b(TableRelation\s*=\s*|SourceTable\s*=\s*|Record\s*)(Object|"Object"|2000000001)/gi;
    // Replace Object with AllObjWithCaption
    let updatedContent = content.replace(objectTablePattern, (match, m1, objectTable) => {
        return match.replace(objectTable, 'AllObjWithCaption');
    });
    // Update table's field names
    if (updatedContent.includes('SourceTable = AllObjWithCaption;')) {
        let fieldsPattern = /\b(ID|Name|Type|Caption|Subtype)(\s*,|\s*\)|\s*:)/gi;
        updatedContent = updatedContent.replace(fieldsPattern, (match, field) => {
            return match.replace(field, `"Object ${field}"`);
        })
    }
    return updatedContent;
}

/**
 * Refactor scope internal property based on project target
 * @param {string} target
 * @param {string} content
 */
function resolveScopeInternal(target, content) {
    let updatedContent = content;
    if (target == 'Cloud') {
        updatedContent = removeScopeInternal(content);
    } else {
        updatedContent = content.replaceAll("[Scope('Internal')]", "[Scope('OnPrem')]");
    }
    return updatedContent;
}

/**
 * Remove [Scope('Internal')] procedure property
 * @param {string} content
 */
function removeScopeInternal(content) {

    let targetString = "[Scope('Internal')]";
    // Split the content into an array of lines
    let lines = content.split('\n');
    // Filter out any line that contains the target string
    let filteredLines = lines.filter(line => !line.includes(targetString));
    // Join the remaining lines back into a single string
    let updatedContent = filteredLines.join('\n');

    return updatedContent;
}