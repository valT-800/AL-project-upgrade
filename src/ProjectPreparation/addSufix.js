const { getALFiles, writeAndSaveFile, getFileContent, getDocumentErrors, getTextDocumentFromFilePath } = require('../ProjectWorkspaceManagement/workspaceMgt.js');

const path = require('path');
const fs = require('fs');

module.exports.addSufix1 = async function (/** @type {string} */ sufix) {

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
        const updatedContent = addSufixToALObjectName(fileContent, sufix);
        if (updatedContent !== fileContent) {
            // Write the updated content back to the file
            await writeAndSaveFile(file, updatedContent);
            // Rename the file with sufix added
            //await addSufixToFile(file, sufix);
            // Declare file modification
            changed = true;
        }
    }

    // Go through every src/Standard directory file
    for (const file of standardALfiles) {
        // Read and modify the file content
        const fileContent = await getFileContent(file);
        let updatedContent = addSufixToALObjectName(fileContent, sufix);
        updatedContent = addSufixToTableExtFields(updatedContent, sufix);
        updatedContent = addSufixToPageReportContent(updatedContent, sufix);
        updatedContent = addSufixToProcedures(updatedContent, sufix);
        if (updatedContent !== fileContent) {
            // Write the updated content back to the file
            await writeAndSaveFile(file, updatedContent);
            // Rename the file with sufix added
            //await addSufixToFile(file, sufix);
            // Declare file modification
            changed = true;
        }
    }
    if (!changed) return 'All relevant object already have a provided Sufix added.';
    return 'Sufix added to all relevant objects. \nTo resolve errors run "SPLN: Add Sufix step 2. Resolve errors"';
}

module.exports.addSufix2 = async function (/** @type {string} */ sufix) {

    let customALfiles = await getALFiles('src/Custom');
    let standardALfiles = await getALFiles('src/Standard');

    if (standardALfiles.length === 0 && customALfiles.length === 0)
        return 'No AL files found in the src directory.';

    // Declare when any files have been changed
    let changed = false;
    for (const file of customALfiles) {
        // Read and modify the file object name
        const fileContent = await getFileContent(file);
        let errors = ['is missing'];
        errors.push('is not found in the target');
        let updatedContent = await addSufixToReferences(file, fileContent, sufix, errors);
        if (updatedContent == fileContent) {
            errors = ['does not contain a definition for'];
            errors.push('does not exist');
            updatedContent = await addSufixToReferences(file, updatedContent, sufix, errors);
        }
        if (updatedContent !== fileContent) {
            // Write the updated content back to the file
            await writeAndSaveFile(file, updatedContent);
            // Rename the file with sufix added
            //await addSufixToFile(file, sufix);
            // Declare file modification
            changed = true;
        }
    }
    for (const file of standardALfiles) {
        // Read and modify the file content
        const fileContent = await getFileContent(file);
        let errors = ['is missing'];
        errors.push('is not found in the target');
        let updatedContent = await addSufixToReferences(file, fileContent, sufix, errors);
        if (updatedContent == fileContent) {
            errors = ['does not contain a definition for'];
            errors.push('does not exist');
            updatedContent = await addSufixToReferences(file, updatedContent, sufix, errors);
        }
        if (updatedContent !== fileContent) {
            // Write the updated content back to the file
            await writeAndSaveFile(file, updatedContent);
            // Rename the file with sufix added
            //await addSufixToFile(file, sufix);
            changed = true;
        }
    }
    if (changed)
        return 'Please run this command again after few seconds!';
    return 'Sufix errors resolved. Please run command "SPLN: Add Sufix step 3. Clean up!"';
}

/**
 * Add sufix to the AL file name
 * @param {string} filePath
 * @param {string} sufix
 */
async function addSufixToFile(filePath, sufix) {
    let fileName = path.basename(filePath, '.al'); // file name without '.al' extension
    const fileNameSplitted = fileName.split('.'); // string array with file name substrings splitted by dot
    const fileObjectType = fileNameSplitted[fileNameSplitted.length - 1];
    fileName = fileNameSplitted.slice(0, -1).join('.'); // file name without object type
    const newFileName = `${fileName}${sufix}.${fileObjectType}.al`;
    const newFilePath = path.join(path.dirname(filePath), newFileName);

    // Rename the file
    await fs.promises.rename(filePath, newFilePath);
    return newFilePath;
}

/**
 * Add sufix to table fields
 * @param {string} content
 * @param {string} sufix
 */
function addSufixToTableExtFields(content, sufix) {

    // Regex patterns for AL extension fields, actions, layouts and procedures
    const tableFieldPattern = /\bfield\s*\((\d+);\s*("[^"]+"|\w+)\s*;/g;

    // Add sufix to table fields
    let updatedContent = content.replace(tableFieldPattern, (match, fieldNumber, fieldName) => {
        // Do not change tables field name with already added sufix
        if (!fieldName.endsWith(`_${sufix}`) && !fieldName.endsWith(`_${sufix}"`)) {
            // Add sufix to the field name with quotes
            if (fieldName.startsWith('"'))
                return match.replace(fieldName, `${fieldName.slice(0, -1)}_${sufix}"`);
            else
                // Add sufix to the field name without quotes
                return match.replace(fieldName, `${fieldName}_${sufix}`);
        }
        return match;
    });

    return updatedContent;
}

// 
/**
 * Add sufix to object, field and procedure references
 * @param {string} content
 * @param {string} sufix
 * @param {string} file
 * @param {string[]} errors
 */
async function addSufixToReferences(file, content, sufix, errors) {
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

            // Search for the custom pageextension fields and add sufix to the name and the source
            const pageFieldPattern = /\bfield\s*\(\s*("[^"]*"|\w+)\s*;\s*("[^"]*"|\w+|("[^"]*"|\w+).("[^"]*"|\w+))\s*\)/g;
            let updatedLine = errorLine.replace(pageFieldPattern, (match, fieldName, fieldSource) => {

                if (!fieldName.includes(`_${sufix}`)) {
                    // Add sufix to field name and field source with quotes
                    if (fieldName.startsWith('"') && fieldSource.endsWith('"'))
                        return `field(${fieldName.slice(0, -1)}_${sufix}"; ${fieldSource.slice(0, -1)}_${sufix}")`;
                    // Add sufix to field name without quotes and field source with quotes
                    else if (!fieldName.startsWith('"') && fieldSource.endsWith('"'))
                        return `field(${fieldName}_${sufix}; ${fieldSource.slice(0, -1)}_${sufix}")`;
                    // Add sufix to field name with quotes and field source without quotes
                    else if (fieldName.startsWith('"') && !fieldSource.endsWith('"'))
                        return `field(${fieldName.slice(0, -1)}_${sufix}"; ${fieldSource}_${sufix})`;
                    // Add sufix to field name and field source without quotes
                    else return `field(${fieldName}_${sufix}; ${fieldSource}_${sufix})`;
                }
                return match;
            });

            // Search for filter or field in CalcFormula and add sufix
            if (errorLine == updatedLine) {
                const calcfieldPattern = /\b(filter|field)\s*\(\s*("[^"]*"|\w+)\s*\)/gi;
                let updatedSnippet = errorSnippet.replace(calcfieldPattern, (match, method, field) => {
                    if (!field.includes(`_${sufix}`)) {
                        // Add sufix to field name with quotes
                        if (field.startsWith('"')) return match.replace(field, `"${field.slice(1, -1)}_${sufix}"`);
                        // Add sufix to field name without quotes
                        else return match.replace(field, `${field}_${sufix}`);
                    }
                    return match;
                });
                updatedLine = errorLine.replace(errorSnippet, updatedSnippet);
            }
            // Search for object, field and procedure references, and add sufix
            if (errorLine == updatedLine && !errorSnippet.startsWith('DotNet') && !errorSnippet.endsWith(')') && errorSnippet !== 'Rec') {
                // Regex for fields going after some common characters
                let pattern = /(=\s*|if\s*)("[^"]+"|\w+)/gi;
                errorLine.replace(pattern, (match, m1, field) => {
                    if (errorSnippet == field && !field.includes(`_${sufix}`)) {
                        // Add sufix to field or object name with quotes
                        if (errorSnippet.endsWith('"'))
                            updatedLine = `${errorLine.slice(0, startPosition.character)}${errorSnippet.slice(0, -1)}_${sufix}"${errorLine.slice(endPosition.character)}`;
                        // Add sufix to field or object name without quotes
                        else
                            updatedLine = `${errorLine.slice(0, startPosition.character)}${errorSnippet}_${sufix}${errorLine.slice(endPosition.character)}`;
                    }
                    return match;
                });
                // Regex for fields and tables followed by some common characters
                pattern = /("[^"]+"|\w+)(\s*;|\s*,|\s*\(|\s*\)|\s*:|\s*=|\s*<|\s*>|\s*:=|\s*\+|\s*\-|\s*\/|\s+then)/gi;
                errorLine.replace(pattern, (match, object) => {
                    if (errorSnippet == object && !object.includes(`_${sufix}`)) {
                        // Add sufix to field or object name with quotes
                        if (errorSnippet.endsWith('"'))
                            updatedLine = `${errorLine.slice(0, startPosition.character)}${errorSnippet.slice(0, -1)}_${sufix}"${errorLine.slice(endPosition.character)}`;
                        // Add sufix to field or object name without quotes
                        else
                            updatedLine = `${errorLine.slice(0, startPosition.character)}${errorSnippet}_${sufix}${errorLine.slice(endPosition.character)}`;
                    }
                    return match;
                });
            }
            // Remove sufix dublicates
            updatedLine = updatedLine.replace(`_${sufix}_${sufix}`, `_${sufix}`);

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
 * Add sufix to report layouts, page and requestpage actions
 * @param {string} content
 * @param {string} sufix
 */
function addSufixToPageReportContent(content, sufix) {

    const actionPattern = /\baction\s*\(\s*("[^"]+"|\w+)\s*\)/g;
    const reportLayoutPattern = /\blayout\s*\(\s*("[^"]+"|\w+)\s*\)/g;

    // Add sufix to actions
    let updatedContent = content.replace(actionPattern, (match, actionName) => {
        if (!actionName.endsWith(`_${sufix}`) && !actionName.endsWith(`_${sufix}"`)) {
            // Add sufix to action name with quotes
            if (actionName.startsWith('"'))
                return match.replace(actionName, `"${actionName.slice(1, -1)}_${sufix}"`);
            // Add sufix to action name without quotes
            else return match.replace(actionName, `${actionName}_${sufix}`);
        }
        return match;
    });
    // Add sufix to report layouts
    updatedContent = updatedContent.replace(reportLayoutPattern, (match, layoutName) => {
        if (!layoutName.endsWith(`_${sufix}`) && !layoutName.endsWith(`_${sufix}"`)) {
            // Add sufix to layout name with quotes
            if (layoutName.startsWith('"'))
                return match.replace(layoutName, `"${layoutName.slice(1, -1)}_${sufix}"`);
            // Add sufix to layout name without quotes
            else return match.replace(layoutName, `${layoutName}_${sufix}`);
        }
        return match;
    });
    return updatedContent;
}

/**
 * Add sufix to procedures
 * @param {string} content
 * @param {string} sufix
 */
function addSufixToProcedures(content, sufix) {

    // Regex pattern for procedures
    const procedurePattern = /\bprocedure\s+("[^"]+"|\w+)\s+\(/g;

    let updatedContent = content.replace(procedurePattern, (match, procedureName) => {
        if (!procedureName.endsWith(`_${sufix}`) && !procedureName.endsWith(`_${sufix}"`)) {
            // Add sufix to procedure name with quotes
            if (procedureName.startsWith('"'))
                return match.replace(procedureName, `"${procedureName.slice(1, -1)}_${sufix}"`);
            // Add sufix to procedure name without quotes
            else return match.replace(procedureName, `${procedureName}_${sufix}`);
        }
        return match;
    });

    return updatedContent;
}

/**
 * Add sufix to AL object names
 * @param {string} content
 * @param {string} sufix
 */
function addSufixToALObjectName(content, sufix) {
    // Regex pattern for all AL objects
    const objectPattern = /\b(page|table|codeunit|report|enum|query|xmlport|profile|controladdin|permissionset|interface|tableextension|pageextension|reportextension|enumextension|permissionsetextension)\s+(\d+)\s+("[^"]+"|\w+)\s*(\{|extends)/g;

    let updatedContent = content.replace(objectPattern, (match, objectType, objectNumber, objectName) => {
        if (!objectName.endsWith(`_${sufix}`) && !objectName.endsWith(`_${sufix}"`)) {
            // Add sufix to the object name with quotes
            if (objectName.startsWith('"'))
                return match.replace(objectName, `"${objectName.slice(1, -1)}_${sufix}"`);
            // Add sufix to the object name without quotes
            return match.replace(objectName, `${objectName}_${sufix}`);
        }
        return match;
    });

    return updatedContent;
}



