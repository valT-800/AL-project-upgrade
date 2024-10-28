const { getALFiles, writeAndSaveFile, getFileContent, getDocumentErrors, getTextDocumentFromFilePath } = require('../ProjectWorkspaceManagement/workspaceMgt.js');

const path = require('path');
const fs = require('fs');

module.exports.addSuffix1 = async function (/** @type {string} */ suffix) {

    const customALfiles = await getALFiles('src/Custom');
    const standardALfiles = await getALFiles('src/Standard');
    if (!customALfiles && !standardALfiles) return;
    if (customALfiles.length === 0 && standardALfiles.length === 0)
        return 'No AL files found in the src directory.';

    // Declare when any files have been changed
    let changed = false;

    // Go through every src/Custom directory file
    for (const file of customALfiles) {
        // Read and modify the file object name
        const fileContent = await getFileContent(file);
        const updatedContent = addSuffixToALObjectName(fileContent, suffix);
        if (updatedContent !== fileContent) {
            // Write the updated content back to the file
            await writeAndSaveFile(file, updatedContent);
            // Rename the file with suffix added
            //await addSuffixToFile(file, suffix);
            // Declare file modification
            changed = true;
        }
    }

    // Go through every src/Standard directory file
    for (const file of standardALfiles) {
        // Read and modify the file content
        const fileContent = await getFileContent(file);
        let updatedContent = addSuffixToALObjectName(fileContent, suffix);
        updatedContent = addSuffixToTableFields(updatedContent, suffix);
        if (fileContent.startsWith('pageextension '))
            updatedContent = addSuffixToActions(updatedContent, suffix);
        if (fileContent.startsWith('report '))
            updatedContent = addSuffixToReportLayouts(updatedContent, suffix);
        if (fileContent.startsWith('tableextension ') || fileContent.startsWith('pageextension '))
            updatedContent = addSuffixToProcedures(updatedContent, suffix);
        if (updatedContent !== fileContent) {
            // Write the updated content back to the file
            await writeAndSaveFile(file, updatedContent);
            // Rename the file with suffix added
            //await addSuffixToFile(file, suffix);
            // Declare file modification
            changed = true;
        }
    }
    if (!changed) return 'All relevant object already have a provided Suffix added.';
    return 'Suffix added to all relevant objects. \nTo resolve errors run "SPLN: Add Suffix step 2. Resolve errors"';
}

module.exports.addSuffix2 = async function (/** @type {string} */ suffix) {

    const ALfiles = await getALFiles('src');

    if (ALfiles.length === 0)
        return 'No AL files found in the src directory.';

    // Declare when any files have been changed
    let changed = false;
    for (const file of ALfiles) {
        // Read and modify the file object name
        const fileContent = await getFileContent(file);
        let errors = ['is missing'];
        errors.push('is not found in the target');
        let updatedContent = await addSuffixToReferences(file, fileContent, suffix, errors);
        if (updatedContent == fileContent) {
            errors = ['does not contain a definition for'];
            errors.push('does not exist');
            errors.push('The source of a Column or Filter must be a field defined on the table referenced by its parent DataItem');
            errors.push('must be a member');
            updatedContent = await addSuffixToReferences(file, updatedContent, suffix, errors);
        }
        if (updatedContent !== fileContent) {
            // Write the updated content back to the file
            await writeAndSaveFile(file, updatedContent);
            // Rename the file with suffix added
            //await addSuffixToFile(file, suffix);
            // Declare file modification
            changed = true;
        }
    }
    if (changed)
        return 'Please run this command again after few seconds!';
    return 'Suffix errors resolved. Please run command "SPLN: Add Suffix step 3. Clean up!"';
}

/**
 * Add suffix to the AL file name
 * @param {string} filePath
 * @param {string} suffix
 */
async function addSuffixToFile(filePath, suffix) {
    let fileName = path.basename(filePath, '.al'); // file name without '.al' extension
    const fileNameSplitted = fileName.split('.'); // string array with file name substrings splitted by dot
    const fileObjectType = fileNameSplitted[fileNameSplitted.length - 1];
    fileName = fileNameSplitted.slice(0, -1).join('.'); // file name without object type
    const newFileName = `${fileName}${suffix}.${fileObjectType}.al`;
    const newFilePath = path.join(path.dirname(filePath), newFileName);

    // Rename the file
    await fs.promises.rename(filePath, newFilePath);
    return newFilePath;
}

/**
 * Add suffix to table fields
 * @param {string} content
 * @param {string} suffix
 */
function addSuffixToTableFields(content, suffix) {

    // Regex patterns for table fields
    const tableFieldPattern = /\bfield\s*\((\d+);\s*("[^"]+"|\w+)\s*;/g;

    // Add suffix to table fields
    let updatedContent = content.replace(tableFieldPattern, (match, fieldNumber, fieldName) => {
        // Do not change tables field name with already added suffix
        if (!fieldName.endsWith(`_${suffix}`) && !fieldName.endsWith(`_${suffix}"`)) {
            // Add suffix to the field name with quotes
            if (fieldName.startsWith('"'))
                return match.replace(fieldName, `${fieldName.slice(0, -1)}_${suffix}"`);
            else
                // Add suffix to the field name without quotes
                return match.replace(fieldName, `${fieldName}_${suffix}`);
        }
        return match;
    });

    return updatedContent;
}

// 
/**
 * Add suffix to object, field and procedure references
 * @param {string} content
 * @param {string} suffix
 * @param {string} file
 * @param {string[]} errors
 */
async function addSuffixToReferences(file, content, suffix, errors) {
    try {
        // Open the document and get errors
        const document = await getTextDocumentFromFilePath(file);
        const diagnostics = await getDocumentErrors(document, errors);
        // End function when no errors found
        if (diagnostics.length == 0)
            return content;
        let updatedContent = content;
        // Go through every error
        diagnostics.forEach((diagnostic) => {
            // Get the start and end positions of the diagnostic
            const startPosition = diagnostic.range.start;
            const endPosition = diagnostic.range.end;
            // Get the content of the line from the document
            const errorLine = document.lineAt(startPosition.line).text;
            // Extract the exact substring that caused the error based on the range
            const errorSnippet = errorLine.substring(startPosition.character, endPosition.character);
            // End function when error causer is digital
            if (errorSnippet.match(/\D+/g) == null)
                return content;

            // Search for the custom pageextension fields and add suffix to the name and the source
            const pageFieldPattern = /\bfield\s*\(\s*("[^"]*"|\w+)\s*;\s*("[^"]*"|\w+|("[^"]*"|\w+).("[^"]*"|\w+))\s*\)/g;
            let updatedLine = errorLine.replace(pageFieldPattern, (match, fieldName, fieldSource) => {

                if (!fieldName.includes(`_${suffix}`)) {
                    // Add suffix to field name and field source with quotes
                    if (fieldName.startsWith('"') && fieldSource.endsWith('"'))
                        return `field(${fieldName.slice(0, -1)}_${suffix}"; ${fieldSource.slice(0, -1)}_${suffix}")`;
                    // Add suffix to field name without quotes and field source with quotes
                    else if (!fieldName.startsWith('"') && fieldSource.endsWith('"'))
                        return `field(${fieldName}_${suffix}; ${fieldSource.slice(0, -1)}_${suffix}")`;
                    // Add suffix to field name with quotes and field source without quotes
                    else if (fieldName.startsWith('"') && !fieldSource.endsWith('"'))
                        return `field(${fieldName.slice(0, -1)}_${suffix}"; ${fieldSource}_${suffix})`;
                    // Add suffix to field name and field source without quotes
                    else return `field(${fieldName}_${suffix}; ${fieldSource}_${suffix})`;
                }
                return match;
            });

            // Search for filter or field in CalcFormula and add suffix
            if (errorLine == updatedLine) {
                const calcfieldPattern = /\b(filter|field)\s*\(\s*("[^"]*"|\w+)\s*\)/gi;
                let updatedSnippet = errorSnippet.replace(calcfieldPattern, (match, method, field) => {
                    if (!field.includes(`_${suffix}`)) {
                        // Add suffix to field name with quotes
                        if (field.startsWith('"')) return match.replace(field, `"${field.slice(1, -1)}_${suffix}"`);
                        // Add suffix to field name without quotes
                        else return match.replace(field, `${field}_${suffix}`);
                    }
                    return match;
                });
                updatedLine = errorLine.replace(errorSnippet, updatedSnippet);
            }
            if (errorLine == updatedLine) {
                const calcfieldPattern = /("[^"]*"|\w+)\s*=\s*\b(filter|field)\s*\(\s*("[^"]*"|\w+)\s*\)/gi;
                let updatedSnippet = errorSnippet.replace(calcfieldPattern, (match, match1, method, field) => {
                    if (!match1.includes(`_${suffix}`)) {
                        // Add suffix to field name with quotes
                        if (match1.startsWith('"')) return match.replace(match1, `"${match1.slice(1, -1)}_${suffix}"`);
                        // Add suffix to field name without quotes
                        else return match.replace(match1, `${match1}_${suffix}`);
                    }
                    return match;
                });
                updatedLine = errorLine.replace(errorSnippet, updatedSnippet);
            }

            // Search for object reference variables and add suffix
            if (errorLine == updatedLine) {
                const variablePattern = /\b(Record|Query|XMLport|Report|Codeunit|Page)\s+("[^"]*"|\w+)\s*/gi;
                let updatedSnippet = errorSnippet.replace(variablePattern, (match, variableType, variableSource) => {
                    if (errorSnippet == match && !variableSource.includes(`_${suffix}`)) {
                        // Add suffix to variable source name with quotes
                        if (variableSource.endsWith('"'))
                            return match.replace(variableSource, `"${variableSource.slice(1, -1)}_${suffix}"`);
                        // Add suffix to variable source name without quotes
                        else return match.replace(variableSource, `${variableSource}_${suffix}`);
                    }
                    return match;
                });
                updatedLine = errorLine.replace(errorSnippet, updatedSnippet);
            }
            // Search for object fields and procedures references and add suffix
            if (errorLine == updatedLine) {
                const recFieldPattern = /("[^"]*"|(?<!")\w+)\.("[^"]*"|(?<!")\w+)/g;
                let updatedSnippet = errorSnippet.replace(recFieldPattern, (match, record, field) => {
                    if (errorSnippet == match && !field.includes(`_${suffix}`)) {
                        // Do not add suffix when pattern found inside a field or object reference
                        if (errorSnippet.startsWith('"') && !record.endsWith('"')) return match;
                        // Add suffix to field or object name with quotes
                        if (field.startsWith('"'))
                            return match.replace(field, `${field.slice(0, -1)}_${suffix}"`);
                        // Add suffix to field or procedure name without quotes
                        else return match.replace(field, `${field}_${suffix}`);
                    }
                    return match;
                });
                updatedLine = errorLine.replace(errorSnippet, updatedSnippet);
            }
            // Search for object, field and procedure references, and add suffix
            if (errorLine == updatedLine && !errorSnippet.startsWith('DotNet') && errorSnippet !== 'Rec') {
                // Regex for fields going after some common characters
                let pattern = /(=\s*|\(|\+\s*|-\s*|<\s*|>\s*|\*\s*|\s*\/|\.|\,\s*|;\s*|\bif\s*|\bor\s*|\bcase\s*)("[^"]+"|\w+)/gi;
                errorLine.replace(pattern, (match, m1, field) => {
                    if (errorSnippet == field && !field.includes(`_${suffix}`)) {
                        // Add suffix to field or object name with quotes
                        if (errorSnippet.endsWith('"'))
                            updatedLine = `${errorLine.slice(0, startPosition.character)}${errorSnippet.slice(0, -1)}_${suffix}"${errorLine.slice(endPosition.character)}`;
                        // Add suffix to field or object name without quotes
                        else
                            updatedLine = `${errorLine.slice(0, startPosition.character)}${errorSnippet}_${suffix}${errorLine.slice(endPosition.character)}`;
                    }
                    return match;
                });
                if (errorLine == updatedLine) {
                    // Regex for fields and tables followed by some common characters
                    pattern = /("[^"]+"|\w+)(\s*;|\s*,|\s*\(|\s*\)|\s*:|\s*=|\s*<|\s*>|\s*\+|\s*\-|\s*\/|\s*\*|\s*\/|\s+then|\.|\s*where|\s*in|\s*and)/gi;
                    errorLine.replace(pattern, (match, object) => {
                        if (errorSnippet == object && !object.includes(`_${suffix}`)) {
                            // Add suffix to field or object name with quotes
                            if (errorSnippet.endsWith('"'))
                                updatedLine = `${errorLine.slice(0, startPosition.character)}${errorSnippet.slice(0, -1)}_${suffix}"${errorLine.slice(endPosition.character)}`;
                            // Add suffix to field or object name without quotes
                            else
                                updatedLine = `${errorLine.slice(0, startPosition.character)}${errorSnippet}_${suffix}${errorLine.slice(endPosition.character)}`;
                        }
                        return match;
                    });
                }
            }
            updatedContent = updatedContent.replace(errorLine, updatedLine);
            // Remove suffix dublicates
            updatedContent = updatedContent.replace(`_${suffix}_${suffix}`, `_${suffix}`);
        });
        return updatedContent;
    }
    catch (error) {
        console.error(`Error modifying file: ${error}`);
        return content;
    }
}

/**
 * Add suffix to actions
 * @param {string} content
 * @param {string} suffix
 */
function addSuffixToActions(content, suffix) {

    const actionPattern = /\baction\s*\(\s*("[^"]+"|\w+)\s*\)/g;

    // Add suffix to actions
    let updatedContent = content.replace(actionPattern, (match, actionName) => {
        if (!actionName.endsWith(`_${suffix}`) && !actionName.endsWith(`_${suffix}"`)) {
            // Add suffix to action name with quotes
            if (actionName.startsWith('"'))
                return match.replace(actionName, `"${actionName.slice(1, -1)}_${suffix}"`);
            // Add suffix to action name without quotes
            else return match.replace(actionName, `${actionName}_${suffix}`);
        }
        return match;
    });
    return updatedContent;
}
/**
 * Add suffix to report layouts
 * @param {string} content
 * @param {string} suffix
 */
function addSuffixToReportLayouts(content, suffix) {

    const reportLayoutPattern = /\blayout\s*\(\s*("[^"]+"|\w+)\s*\)/g;

    // Add suffix to report layouts
    let updatedContent = content.replace(reportLayoutPattern, (match, layoutName) => {
        if (!layoutName.endsWith(`_${suffix}`) && !layoutName.endsWith(`_${suffix}"`)) {
            // Add suffix to layout name with quotes
            if (layoutName.startsWith('"'))
                return match.replace(layoutName, `"${layoutName.slice(1, -1)}_${suffix}"`);
            // Add suffix to layout name without quotes
            else return match.replace(layoutName, `${layoutName}_${suffix}`);
        }
        return match;
    });
    return updatedContent;
}

/**
 * Add suffix to procedures
 * @param {string} content
 * @param {string} suffix
 */
function addSuffixToProcedures(content, suffix) {

    // Regex pattern for procedures
    const procedurePattern = /\bprocedure\s+("[^"]+"|\w+)\s+\(/g;

    let updatedContent = content.replace(procedurePattern, (match, procedureName) => {
        if (!procedureName.endsWith(`_${suffix}`) && !procedureName.endsWith(`_${suffix}"`)) {
            // Add suffix to procedure name with quotes
            if (procedureName.startsWith('"'))
                return match.replace(procedureName, `"${procedureName.slice(1, -1)}_${suffix}"`);
            // Add suffix to procedure name without quotes
            else return match.replace(procedureName, `${procedureName}_${suffix}`);
        }
        return match;
    });

    return updatedContent;
}

/**
 * Add suffix to AL object names
 * @param {string} content
 * @param {string} suffix
 */
function addSuffixToALObjectName(content, suffix) {
    // Regex pattern for all AL objects
    const objectPattern = /\b(page|table|codeunit|report|enum|query|xmlport|profile|controladdin|permissionset|interface|tableextension|pageextension|reportextension|enumextension|permissionsetextension)\s+(\d+)\s+("[^"]+"|\w+)\s*(\{|extends)/g;

    let updatedContent = content.replace(objectPattern, (match, objectType, objectNumber, objectName) => {
        if (!objectName.endsWith(`_${suffix}`) && !objectName.endsWith(`_${suffix}"`)) {
            // Add suffix to the object name with quotes
            if (objectName.startsWith('"'))
                return match.replace(objectName, `"${objectName.slice(1, -1)}_${suffix}"`);
            // Add suffix to the object name without quotes
            return match.replace(objectName, `${objectName}_${suffix}`);
        }
        return match;
    });

    return updatedContent;
}



