const { getALFiles, writeAndSaveFile, getFileContent, getDocumentErrors, getTextDocumentFromFilePath } = require('../ProjectWorkspaceManagement/workspaceMgt.js');

const path = require('path');
const fs = require('fs');

module.exports.addPrefix1 = async function (/** @type {string} */ prefix) {

    const customALfiles = await getALFiles('src/Custom');
    const standardALfiles = await getALFiles('src/Standard');
    if (!customALfiles && !standardALfiles) return;
    if (customALfiles.length === 0 && standardALfiles.length === 0)
        return 'No AL files found in the src directory.';

    // Declare when any files have been changed
    let changed = false;

    // Go through every src/Custom directory file
    for (const file of customALfiles) {
        const fileContent = await getFileContent(file);
        const updatedContent = addPrefixToALObjectName(fileContent, prefix);
        if (updatedContent !== fileContent) {
            // Write the updated content back to the file
            await writeAndSaveFile(file, updatedContent);
            // Rename the file with prefix added
            //await addPrefixToFile(file, prefix);
            // Declare file modification
            changed = true;
        }
    }
    // Go through every src/Standard directory file
    for (const file of standardALfiles) {
        const fileContent = await getFileContent(file);
        let updatedContent = addPrefixToALObjectName(fileContent, prefix);
        updatedContent = addPrefixToTableFields(updatedContent, prefix);
        if (fileContent.startsWith('pageextension '))
            updatedContent = addPrefixToActions(updatedContent, prefix);
        if (fileContent.startsWith('report '))
            updatedContent = addPrefixToLayouts(updatedContent, prefix);
        if (fileContent.startsWith('tableextension ') || fileContent.startsWith('pageextension '))
            updatedContent = addPrefixToProcedures(updatedContent, prefix);
        if (updatedContent !== fileContent) {
            // Write the updated content back to the file
            await writeAndSaveFile(file, updatedContent);
            // Rename the file with prefix added
            //await addPrefixToFile(file, prefix);
            // Declare file modification
            changed = true;
        }
    }

    if (!changed) return 'All relevant object already have a provided Prefix added.';
    return 'Prefix added to all relevant objects in src. \nTo resolve errors run "SPLN: Add Prefix step 2. Resolve errors"';
}

module.exports.addPrefix2 = async function (/** @type {string} */ prefix) {

    let customALfiles = await getALFiles('src/Custom');
    let standardALfiles = await getALFiles('src/Standard');

    if (standardALfiles.length === 0 && customALfiles.length === 0)
        return 'No AL files found in the src directory.';

    // Declare when any files have been changed
    let changed = false;

    // Go through every src/Custom directory file
    for (const file of customALfiles) {
        const fileContent = await getFileContent(file);
        // Add prefix first to missing object references
        let errors = ['is missing'];
        errors.push('is not found in the target');
        let updatedContent = await addPrefixToReferences(file, fileContent, prefix, errors);
        // Add fields and procedures references
        if (updatedContent == fileContent) {
            errors = ['does not contain a definition for'];
            errors.push('does not exist');
            updatedContent = await addPrefixToReferences(file, updatedContent, prefix, errors);
        }
        if (updatedContent !== fileContent) {
            // Write the updated content back to the file
            await writeAndSaveFile(file, updatedContent);
            // Declare file modification
            changed = true;
            // Rename the file with prefix added
            //await addPrefixToFile(file, prefix);
        }
    }
    // Go through every src/Standard directory file
    for (const file of standardALfiles) {
        // Read and modify the file content
        const fileContent = await getFileContent(file);
        let errors = ['is missing'];
        errors.push('is not found in the target');
        let updatedContent = await addPrefixToReferences(file, fileContent, prefix, errors);
        if (updatedContent == fileContent) {
            errors = ['does not contain a definition for'];
            errors.push('does not exist');
            updatedContent = await addPrefixToReferences(file, updatedContent, prefix, errors);
        }
        if (updatedContent !== fileContent) {
            // Write the updated content back to the file
            await writeAndSaveFile(file, updatedContent);
            // Declare file modification
            changed = true;
            // Rename the file with prefix added
            //await addPrefixToFile(file, prefix);
        }
    }
    if (changed)
        return 'Please run this command again after few seconds!';
    return 'Prefix errors resolved. Please run command "SPLN: Add Prefix step 3. Clean up!"';
}

/**
 * Add prefix to the AL file name
 * @param {string} filePath
 * @param {string} prefix
 */
async function addPrefixToFile(filePath, prefix) {
    let fileName = path.basename(filePath, '.al'); // file name without '.al' extension
    const fileNameSplitted = fileName.split('.'); // string array with file name substrings splitted by dot
    const fileObjectType = fileNameSplitted[fileNameSplitted.length - 1];
    fileName = fileNameSplitted.slice(0, -1).join('.'); // file name without object type
    const newFileName = `${prefix}${fileName}.${fileObjectType}.al`;
    const newFilePath = path.join(path.dirname(filePath), newFileName);

    // Rename the file
    await fs.promises.rename(filePath, newFilePath);
    return newFilePath;
}

/**
 * Add prefix to table fields
 * @param {string} content
 * @param {string} prefix
 */
function addPrefixToTableFields(content, prefix) {

    // Regex patterns for table fields
    const tableFieldPattern = /\bfield\s*\((\d+);\s*("[^"]+"|\w+)\s*;/g;

    // Add prefix to table fields
    let updatedContent = content.replace(tableFieldPattern, (match, fieldNumber, fieldName) => {
        if (!fieldName.startsWith(`${prefix}_`) && !fieldName.startsWith(`"${prefix}_`)) {
            // Add prefix to the field name with quotes
            if (fieldName.startsWith('"'))
                return match.replace(fieldName, `"${prefix}_${fieldName.slice(1, -1)}"`);
            else
                // Add prefix to the field name without quotes
                return match.replace(fieldName, `${prefix}_${fieldName}`);
        }
        return match;
    });

    return updatedContent;
}

/**
 * Add prefix to object, field and procedure references
 * @param {string} content
 * @param {string} prefix
 * @param {string} file
 * @param {string[]} errors
 */
async function addPrefixToReferences(file, content, prefix, errors) {
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
            let errorSnippet = errorLine.substring(startPosition.character, endPosition.character);
            // End function when error causer is digital
            if (errorSnippet.match(/\D+/g) == null)
                return content;
            // Search for the custom pageextension fields and add prefix to the name and the source
            const pageFieldPattern = /\bfield\s*\(\s*("[^"]*"|\w+)\s*;\s*("[^"]*"|\w+|Rec.("[^"]*"|\w+))\s*\)/gi;
            let updatedLine = errorLine.replace(pageFieldPattern, (match, fieldName, fieldSource) => {
                // Cut Rec. from field source
                let rec = '';
                if (fieldSource.startsWith('Rec.')) {
                    fieldSource = fieldSource.slice(4);
                    rec = 'Rec.';
                }

                if (!fieldName.includes(`${prefix}_`)) {
                    // Add prefix to field name and field source with quotes
                    if (fieldName.startsWith('"') && fieldSource.startsWith('"'))
                        return `field("${prefix}_${fieldName.slice(1)}; ${rec}"${prefix}_${fieldSource.slice(1)})`;
                    // Add prefix to field name without quotes and field source with quotes
                    else if (!fieldName.startsWith('"') && fieldSource.startsWith('"'))
                        return `field(${prefix}_${fieldName}; ${rec}"${prefix}_${fieldSource.slice(1)})`;
                    // Add prefix to field name with quotes and field source without quotes
                    else if (fieldName.startsWith('"') && !fieldSource.startsWith('"'))
                        return `field("${prefix}_${fieldName.slice(1)}; ${rec}${prefix}_${fieldSource})`;
                    // Add prefix to field name and field source without quotes
                    else
                        return `field(${prefix}_${fieldName}; ${rec}${prefix}_${fieldSource})`;
                }

                return match;
            });

            // Search for filter or field in CalcFormula and add prefix
            if (errorLine == updatedLine) {
                const calcfieldPattern = /\b(filter|field)\s*\(\s*("[^"]*"|\w+)\s*\)/gi;
                let updatedSnippet = errorSnippet.replace(calcfieldPattern, (match, method, field) => {
                    if (!field.includes(`${prefix}_`)) {
                        // Add prefix to field name with quotes
                        if (field.startsWith('"'))
                            return match.replace(field, `"${prefix}_${field.slice(1)}`);
                        // Add prefix to field name without quotes
                        else return match.replace(field, `${prefix}_${field}`);
                    }
                    return match;
                });
                updatedLine = errorLine.replace(errorSnippet, updatedSnippet);
            }
            // Search for object reference variables and add prefix
            if (errorLine == updatedLine) {
                const variablePattern = /\b(Record|Query|XMLport|Report|Codeunit|Page)\s+("[^"]*"|\w+)\s*/gi;
                let updatedSnippet = errorSnippet.replace(variablePattern, (match, variableType, variableSource) => {
                    if (errorSnippet == match && !variableSource.includes(`${prefix}_`)) {
                        // Add prefix to variable source name with quotes
                        if (variableSource.startsWith('"'))
                            return match.replace(variableSource, `"${prefix}_${variableSource.slice(1)}`);
                        // Add prefix to variable source name without quotes
                        else return match.replace(variableSource, `${prefix}_${variableSource}`);
                    }
                    return match;
                });
                updatedLine = errorLine.replace(errorSnippet, updatedSnippet);
            }
            // Search for object fields and procedures references and add prefix
            if (errorLine == updatedLine) {
                const recFieldPattern = /("[^"]*"|(?<!")\w+)\.("[^"]*"|(?<!")\w+)/g;
                let updatedSnippet = errorSnippet.replace(recFieldPattern, (match, record, field) => {
                    if (errorSnippet == match && !field.includes(`${prefix}_`)) {
                        // Do not add prefix when pattern found inside a field or object reference
                        if (errorSnippet.startsWith('"') && !record.endsWith('"')) return match;
                        // Add prefix to field or object name with quotes
                        if (field.startsWith('"'))
                            return match.replace(field, `"${prefix}_${field.slice(1)}`);
                        // Add prefix to field or procedure name without quotes
                        else return match.replace(field, `${prefix}_${field}`);
                    }
                    return match;
                });
                updatedLine = errorLine.replace(errorSnippet, updatedSnippet);
            }
            // Search for object, field and procedure references, and add prefix
            if (errorLine == updatedLine && !errorSnippet.startsWith('DotNet')) {
                // Regex for field references going after some common characters
                let pattern = /(=\s*|if\s*)("[^"]+"|\w+)/gi;
                errorLine.replace(pattern, (match, m1, field) => {
                    if (errorSnippet == field && !field.includes(`${prefix}_`)) {
                        // Add prefix to field or object name with quotes
                        if (errorSnippet.startsWith('"'))
                            updatedLine = `${errorLine.slice(0, startPosition.character)}"${prefix}_${errorSnippet.slice(1)}${errorLine.slice(endPosition.character)}`;
                        // Add prefix to field or object name without quotes
                        else
                            updatedLine = `${errorLine.slice(0, startPosition.character)}${prefix}_${errorSnippet}${errorLine.slice(endPosition.character)}`;
                    }
                    return match;
                });
                // Regex for field and object references followed by some common characters
                pattern = /("[^"]+"|\w+)(\s*;|\s*,|\s*\(|\s*\)|\s*:|\s*=|\s*<|\s*>|\s*:=|\s*\+|\s*\-|\s*\/|\s+then)/gi;
                errorLine.replace(pattern, (match, object) => {
                    if (errorSnippet == object && !object.includes(`${prefix}_`)) {
                        // Add prefix to field or object name with quotes
                        if (errorSnippet.startsWith('"'))
                            updatedLine = `${errorLine.slice(0, startPosition.character)}"${prefix}_${errorSnippet.slice(1)}${errorLine.slice(endPosition.character)}`;
                        // Add prefix to field or object name without quotes
                        else
                            updatedLine = `${errorLine.slice(0, startPosition.character)}${prefix}_${errorSnippet}${errorLine.slice(endPosition.character)}`;
                    }
                    return match;
                });
            }
            // Remove prefix dublicates
            updatedLine = updatedLine.replace(`${prefix}_${prefix}_`, `${prefix}_`);

            updatedContent = updatedContent.replace(errorLine, updatedLine);

        });
        return updatedContent;
    }
    catch (error) {
        console.error(`Error modifying file: ${error}`);
        return content;
    }
}


/**
 * Add prefix to actions
 * @param {string} content
 * @param {string} prefix
 */
function addPrefixToActions(content, prefix) {

    const actionPattern = /\baction\s*\(\s*("[^"]+"|\w+)\s*\)/g;

    // Add prefix to actions
    let updatedContent = content.replace(actionPattern, (match, actionName) => {
        if (!actionName.startsWith(`${prefix}_`) && !actionName.startsWith(`"${prefix}_`)) {
            // Add prefix to action name with quotes
            if (actionName.startsWith('"'))
                return match.replace(actionName, `"${prefix}_${actionName.slice(1, -1)}"`);
            // Add prefix to action name without quotes
            else return match.replace(actionName, `${prefix}_${actionName}`);
        }
        return match;
    });

    return updatedContent;
}

/**
 * Add prefix to report layouts
 * @param {string} content
 * @param {string} prefix
 */
function addPrefixToLayouts(content, prefix) {

    const reportLayoutPattern = /\blayout\s*\(\s*("[^"]+"|\w+)\s*\)/g;

    // Add prefix to report layouts
    let updatedContent = content.replace(reportLayoutPattern, (match, layoutName) => {
        if (!layoutName.startsWith(`${prefix}_`) && !layoutName.startsWith(`"${prefix}_`)) {
            // Add prefix to layout name with quotes
            if (layoutName.startsWith('"'))
                return match.replace(layoutName, `"${prefix}_${layoutName.slice(1, -1)}"`);
            // Add prefix to layout name without quotes
            else return match.replace(layoutName, `${prefix}_${layoutName}`);
        }
        return match;
    });
    return updatedContent;
}

/**
 * Add prefix to procedures
 * @param {string} content
 * @param {string} prefix
 */
function addPrefixToProcedures(content, prefix) {

    // Regex pattern for procedures
    const procedurePattern = /\bprocedure\s+("[^"]+"|\w+)\s+\(/g;

    let updatedContent = content.replace(procedurePattern, (match, procedureName) => {
        if (!procedureName.startsWith(`${prefix}_`) && !procedureName.startsWith(`"${prefix}_`)) {
            // Add prefix to procedure name with quotes
            if (procedureName.startsWith('"'))
                return match.replace(procedureName, `"${prefix}_${procedureName.slice(1, -1)}"`);
            // Add prefix to procedure name without quotes
            else return match.replace(procedureName, `${prefix}_${procedureName}`);
        }
        return match;
    });

    return updatedContent;
}

/**
 * Add prefix to AL object names
 * @param {string} content
 * @param {string} prefix
 */
function addPrefixToALObjectName(content, prefix) {

    // Regex pattern for all AL objects
    const objectPattern = /\b(page|table|codeunit|report|enum|query|xmlport|profile|controladdin|permissionset|interface|tableextension|pageextension|reportextension|enumextension|permissionsetextension)\s+(\d+)\s+("[^"]+"|\w+)\s*(\{|extends)/g;

    let updatedContent = content.replace(objectPattern, (match, objectType, objectNumber, objectName) => {
        if (!objectName.startsWith(`${prefix}_`) && !objectName.startsWith(`"${prefix}_`)) {
            // Add prefix to the object name with quotes
            if (objectName.startsWith('"'))
                return match.replace(objectName, `"${prefix}_${objectName.slice(1, -1)}"`);
            // Add prefix to the object name without quotes
            else return match.replace(objectName, `${prefix}_${objectName}`);
        }
        return match;
    });

    return updatedContent;
}






