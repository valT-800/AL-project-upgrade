const { getALFiles, writeAndSaveFile, getTextDocumentFromFilePath, getDocumentErrors, getOpenedALDocuments, writeAndSaveDocument } = require('../ProjectWorkspaceManagement/workspaceMgt.js');

module.exports.generalRefactoring = async function () {
    const ALfiles = await getALFiles('');
    if (!ALfiles) return;
    if (ALfiles.length === 0)
        return 'No AL files found in the workspace.';

    // Declare when any files have been changed
    let changed = false;
    // Go through every src directory AL file
    for (const file of ALfiles) {
        // Get AL file document
        const document = await getTextDocumentFromFilePath(file);
        if (document) {
            const fileContent = document.getText();
            let updatedContent = await refactorCrossReference(document, fileContent);
            updatedContent = await refactorSetRecordFilters(document, updatedContent);
            updatedContent = await refactorItemTemplate(document, updatedContent);
            updatedContent = await refactorSoftwareAsAService(document, updatedContent);
            updatedContent = await refactorBuildInvLineBuffer(document, updatedContent);
            updatedContent = await refactorFindInteractTmplCode(document, updatedContent);
            updatedContent = await refactorBatchProcessingParameterMap(document, updatedContent);
            updatedContent = await refactorRunWorkflowEntriesPage(document, updatedContent);
            updatedContent = await refactorLanguageModule(document, updatedContent);
            updatedContent = await refactorObjectTableReference(document, updatedContent);
            if (updatedContent !== fileContent) {
                // Write the updated content back to the file
                await writeAndSaveFile(file, updatedContent);
                // Declare file modification
                changed = true;
            }
        }
    }
    // Recommends to run command again when some content was changed and could have more errors
    if (changed)
        return 'Please run this command again after few seconds!';
    return 'General refactoring completed.';
}

module.exports.generalRefactoringInActiveFiles = async function () {

    const ALdocs = getOpenedALDocuments();
    if (!ALdocs) return;
    if (ALdocs.length === 0)
        return 'No AL files are opened in the workspace.';

    // Declare when any files have been changed
    let changed = false;
    // Go through every opened AL file
    for (const document of ALdocs) {
        const fileContent = document.getText();
        let updatedContent = await refactorCrossReference(document, fileContent);
        updatedContent = await refactorSetRecordFilters(document, updatedContent);
        updatedContent = await refactorItemTemplate(document, updatedContent);
        updatedContent = await refactorSoftwareAsAService(document, updatedContent);
        updatedContent = await refactorBuildInvLineBuffer(document, updatedContent);
        updatedContent = await refactorFindInteractTmplCode(document, updatedContent);
        updatedContent = await refactorBatchProcessingParameterMap(document, updatedContent);
        updatedContent = await refactorRunWorkflowEntriesPage(document, updatedContent);
        updatedContent = await refactorLanguageModule(document, updatedContent);
        updatedContent = await refactorObjectTableReference(document, updatedContent);
        if (updatedContent !== fileContent) {
            // Write the updated content back to the file
            await writeAndSaveDocument(document, updatedContent);
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
 * @param {string} content
 * @param {import("vscode").TextDocument} document
 */
async function refactorCrossReference(document, content) {
    try {
        const errors = [' is removed. Reason: Cross-Reference replaced by Item Reference feature.. Tag: 22.0.'];
        errors.push("Table 'Item Cross Reference' is removed. Reason: Replaced by ItemReference table as part of Item Reference feature.. Tag: 22.0.");
        errors.push(`'Record "Item Reference"' does not contain a definition for`);
        errors.push("Page 'Item Cross Reference Entries' is missing");
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
            else if (errorSnippet == '"Item Cross Reference Entries"')
                updatedSnippet = '"Item Reference Entries"';
            else if (errorSnippet == '"Item Cross Reference"')
                updatedSnippet = '"Item Reference"';
            else updatedSnippet = errorSnippet.replace('Cross-', 'Item ');
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
 * @param {import("vscode").TextDocument} document
 * @param {string} content
 */
async function refactorLanguageModule(document, content) {
    try {
        const errors = [`'Record Language' does not contain a definition for 'GetUserLanguage'`];
        errors.push(`'Record Language' does not contain a definition for 'GetLanguageID'`);
        const diagnostics = await getDocumentErrors(document, errors);
        // Return original content when no errors found
        if (diagnostics.length == 0)
            return content;
        let updatedContent = content;
        // Go through every error
        diagnostics.forEach(diagnostic => {
            // Get the start position of the diagnostic
            const startPosition = diagnostic.range.start;
            // Get the content of the line from the document
            const errorLine = document.lineAt(startPosition.line).text;
            let pattern = /(\w+).GetLanguageID\(/gi;
            let variableName = '';
            // Replace with equivalent Language codeunit's GetLanguageIdOrDefault procedure
            let updatedLine = errorLine.replace(pattern, (match, variable) => {
                variableName = variable;
                return 'LanguageMgt.GetLanguageIdOrDefault(';
            });
            if (updatedLine == errorLine) {
                pattern = /(\w+).GetUserLanguage(\(\)|\)|;)/gi;
                updatedLine = errorLine.replace(pattern, (match, variable, end) => {
                    variableName = variable;
                    return `LanguageMgt.GetUserLanguageCode${end}`;
                });
            }
            updatedContent = content.replace(errorLine, updatedLine);
            if (updatedContent !== content) {
                pattern = new RegExp(`(\\s+)${variableName}\\s*:\\s*\\bRecord\\s+(Language|"Language");(\\s+\\w+)`, 'g');
                // Add Language codeunit variable after used before Language record variable
                updatedContent = updatedContent.replace(pattern, (match, space, match1, match2) => {
                    if (!match2.includes('LanguageMgt'))
                        return `${space}${variableName}: Record ${match1};${space}LanguageMgt: Codeunit Language;${match2}`;
                    return match;
                });
            }
        });
        return updatedContent;
    } catch (error) {
        console.error(`Error refactoring RunWorkflowEntriesPage: ${error}`);
        return content;
    }
}

/**
 * Replace Object table with AllObjWithCaption and it's fields
 * @param {import("vscode").TextDocument} document
 * @param {string} content
 */
async function refactorObjectTableReference(document, content) {
    try {
        const errors = [`The application object or method 'Object' has scope 'OnPrem' and cannot be used for 'Cloud' development.`];
        const diagnostics = await getDocumentErrors(document, errors);
        // Return original content when no errors found
        if (diagnostics.length == 0)
            return content;
        let updatedContent = content;
        // Go through every error
        diagnostics.forEach(diagnostic => {
            // Get the start position of the diagnostic
            const startPosition = diagnostic.range.start;
            // Get the content of the line from the document
            const errorLine = document.lineAt(startPosition.line).text;
            let objectTablePattern = /\b(TableRelation\s*=\s*|SourceTable\s*=\s*|Record\s*)(Object|"Object"|2000000001)/gi;
            // Replace Object with AllObjWithCaption
            let updatedLine = errorLine.replace(objectTablePattern, (match, m1, objectTable) => {
                return match.replace(objectTable, 'AllObjWithCaption');
            });
            updatedContent = updatedContent.replace(errorLine, updatedLine);
            // Update table's field names
            if (updatedContent.includes('SourceTable = AllObjWithCaption;')) {
                let fieldsPattern = /\b(?<!CurrPage\.)(ID|Name|Type|Caption|Subtype)(\s*,|\s*\)|\s*:)/gi;
                updatedContent = updatedContent.replace(fieldsPattern, (match, field) => {
                    return match.replace(field, `"Object ${field}"`);
                })
            }
        });
        return updatedContent;
    } catch (error) {
        console.error(`Error refactoring Object table: ${error}`);
        return content;
    }
}

// /**
//  * Refactor scope property based on project target
//  * @param {string} target
//  * @param {string} content
//  */
// function resolveScopeProperty(target, content) {
//     let updatedContent = content;
//     if (target == '"Cloud"') {
//         updatedContent = removeScopeInternalAndOnPrem(content);
//     } else if (target == '"OnPrem"') {
//         updatedContent = content.replaceAll("[Scope('Internal')]", "[Scope('OnPrem')]");
//     }
//     return updatedContent;
// }

// /**
//  * Remove [Scope('Internal')] and [Scope('OnPrem')] procedure property
//  * @param {string} content
//  */
// function removeScopeInternalAndOnPrem(content) {

//     let targetString = "[Scope('Internal')]";
//     // Split the content into an array of lines
//     let lines = content.split('\n');
//     // Filter out any line that contains the target string
//     let filteredLines = lines.filter(line => !line.includes(targetString));
//     targetString = "[Scope('OnPrem')]";
//     filteredLines = filteredLines.filter(line => !line.includes(targetString));

//     // Join the remaining lines back into a single string
//     let updatedContent = filteredLines.join('\n');

//     return updatedContent;
// }
/**
 * @param {import("vscode").TextDocument} document
 * @param {string} content
 */
async function refactorSetRecordFilters(document, content) {
    try {
        const errors = [`'Page "Approval Entries"' does not contain a definition for 'Setfilters'`];
        // Get all document errors with missing "Approval Entries" page's SetFilters procedure
        const diagnostics = await getDocumentErrors(document, errors);
        // Return original content when no errors found
        if (diagnostics.length == 0) {
            return content;
        }
        let updatedContent = content;
        // Go through every error
        diagnostics.forEach(diagnostic => {
            // Get the start position of the diagnostic
            const startPosition = diagnostic.range.start;
            // Get the content of the line from the document
            const errorLine = document.lineAt(startPosition.line).text;
            // Replace with equivalent SetRecordFilters procedure
            const updatedLine = errorLine.replace(/.SetFilters/gi, '.SetRecordFilters');
            updatedContent = content.replace(errorLine, updatedLine);
        });
        return updatedContent;
    } catch (error) {
        console.error(`Error refactoring Cross-Reference: ${error}`);
        return content;
    }
}

/**
 * @param {import("vscode").TextDocument} document
 * @param {string} content
 */
async function refactorItemTemplate(document, content) {
    try {
        const errors = [`Table 'Item Template' is removed. Reason: Deprecate mini templates. Use table "Item Templ." instead and for extensions.. Tag: 21.0.`];
        // Get all document errors of removed "Item Template" table
        const diagnostics = await getDocumentErrors(document, errors);
        // Return original content when no errors found
        if (diagnostics.length == 0) {
            return content;
        }
        let updatedContent = content;
        // Go through every error
        diagnostics.forEach(diagnostic => {
            // Get the start position of the diagnostic
            const startPosition = diagnostic.range.start;
            // Get the content of the line from the document
            const errorLine = document.lineAt(startPosition.line).text;
            // Replace with equivalent "Item Templ." table
            const updatedLine = errorLine.replace(': Record "Item Template"', ': Record "Item Templ."');
            updatedContent = content.replace(errorLine, updatedLine);
        });
        return updatedContent;
    } catch (error) {
        console.error(`Error refactoring Item Template: ${error}`);
        return content;
    }
}


/**
 * @param {import("vscode").TextDocument} document
 * @param {string} content
 */
async function refactorSoftwareAsAService(document, content) {
    try {
        const errors = [`'Codeunit System.Security.AccessControl."Permission Manager"' does not contain a definition for 'SoftwareAsAService'`];
        // Get all document errors of removed SoftwareAsAService procedure
        const diagnostics = await getDocumentErrors(document, errors);
        // Return original content when no errors found
        if (diagnostics.length == 0) {
            return content;
        }
        let updatedContent = content;
        // Go through every error
        diagnostics.forEach(diagnostic => {
            // Get the start position of the diagnostic
            const startPosition = diagnostic.range.start;
            // Get the content of the line from the document
            const errorLine = document.lineAt(startPosition.line).text;
            let pattern = /(\w+).SoftwareAsAService/gi;
            let variableName = '';
            // Replace with equivalent "Environment Information" codeunit's IsSaaS procedure
            const updatedLine = errorLine.replace(pattern, (match, variable) => {
                variableName = variable;
                return 'EnvironmentInfo.IsSaaS'
            });
            updatedContent = content.replace(errorLine, updatedLine);
            if (updatedContent !== content) {
                pattern = new RegExp(`(\\s+)${variableName}\\s*:\\s*\\bCodeunit\\s+"Permission Manager";(\\s+\\w+)`, 'g');
                // Add "Environment Information" codeunit variable after used before "Permission Manager" codeunit variable
                updatedContent = updatedContent.replace(pattern, (match, space, match1) => {
                    if (!match1.includes('EnvironmentInfo'))
                        return `${space}${variableName}: Codeunit "Permission Manager";${space}EnvironmentInfo: Codeunit "Environment Information";${match1}`;
                    return match;
                });
            }
        });
        return updatedContent;
    } catch (error) {
        console.error(`Error refactoring SoftwareAsAService: ${error}`);
        return content;
    }
}

/**
 * @param {import("vscode").TextDocument} document
 * @param {string} content
 */
async function refactorBuildInvLineBuffer(document, content) {
    try {
        const errors = [`'Codeunit Microsoft.Purchases.Posting."Purchase-Post Prepayments"' does not contain a definition for 'BuildInvLineBuffer2'`];
        errors.push(`'Codeunit Microsoft.Sales.Posting."Sales-Post Prepayments"' does not contain a definition for 'BuildInvLineBuffer2'`);
        // Get all document errors of missing BuildInvLineBuffer2 procedure
        const diagnostics = await getDocumentErrors(document, errors);
        // Return original content when no errors found
        if (diagnostics.length == 0) {
            return content;
        }
        let updatedContent = content;
        // Go through every error
        diagnostics.forEach(diagnostic => {
            // Get the start position of the diagnostic
            const startPosition = diagnostic.range.start;
            // Get the content of the line from the document
            const errorLine = document.lineAt(startPosition.line).text;
            // Replace with equivalent BuildInvLineBuffer procedure
            const updatedLine = errorLine.replace('.BuildInvLineBuffer2', '.BuildInvLineBuffer');
            updatedContent = content.replace(errorLine, updatedLine);
        });
        return updatedContent;
    } catch (error) {
        console.error(`Error refactoring BuildInvLineBuffer2: ${error}`);
        return content;
    }
}

/**
 * @param {import("vscode").TextDocument} document
 * @param {string} content
 */
async function refactorFindInteractTmplCode(document, content) {
    try {
        const errors = [`'Codeunit Microsoft.CRM.Segment.SegManagement' does not contain a definition for 'FindInteractTmplCode'`];
        // Get all document errors of missing FindInteractTmplCode procedure
        const diagnostics = await getDocumentErrors(document, errors);
        // Return original content when no errors found
        if (diagnostics.length == 0) {
            return content;
        }
        let updatedContent = content;
        // Go through every error
        diagnostics.forEach(diagnostic => {
            // Get the start position of the diagnostic
            const startPosition = diagnostic.range.start;
            // Get the content of the line from the document
            const errorLine = document.lineAt(startPosition.line).text;
            // Replace with equivalent FindInteractionTemplateCode procedure
            const updatedLine = errorLine.replace('.FindInteractTmplCode', '.FindInteractionTemplateCode');
            updatedContent = content.replace(errorLine, updatedLine);
        });
        return updatedContent;
    } catch (error) {
        console.error(`Error refactoring FindInteractTmplCode: ${error}`);
        return content;
    }
}

/**
 * @param {import("vscode").TextDocument} document
 * @param {string} content
 */
async function refactorBatchProcessingParameterMap(document, content) {
    try {
        const errors = [`Table 'Batch Processing Parameter Map' is removed. Reason: Moved to table Batch Processing Session Map. Tag: 18.0.`];
        // Get all document errors of removed "Batch Processing Parameter Map" table
        const diagnostics = await getDocumentErrors(document, errors);
        // Return original content when no errors found
        if (diagnostics.length == 0) {
            return content;
        }
        let updatedContent = content;
        // Go through every error
        diagnostics.forEach(diagnostic => {
            // Get the start position of the diagnostic
            const startPosition = diagnostic.range.start;
            // Get the content of the line from the document
            const errorLine = document.lineAt(startPosition.line).text;
            // Replace with equivalent "Batch Processing Session Map" table
            const updatedLine = errorLine.replace(': Record "Batch Processing Parameter Map";', ': Record "Batch Processing Session Map";');
            updatedContent = content.replace(errorLine, updatedLine);
        });
        return updatedContent;
    } catch (error) {
        console.error(`Error refactoring FindInteractTmplCode: ${error}`);
        return content;
    }
}

/**
 * @param {import("vscode").TextDocument} document
 * @param {string} content
 */
async function refactorRunWorkflowEntriesPage(document, content) {
    try {
        const errors = [`'Record "Workflows Entries Buffer"' does not contain a definition for 'RunWorkflowEntriesPage'`];
        // Get all document errors of missing RunWorkflowEntriesPage procedure
        const diagnostics = await getDocumentErrors(document, errors);
        // Return original content when no errors found
        if (diagnostics.length == 0) {
            return content;
        }
        let updatedContent = content;
        // Go through every error
        diagnostics.forEach(diagnostic => {
            // Get the start position of the diagnostic
            const startPosition = diagnostic.range.start;
            // Get the content of the line from the document
            const errorLine = document.lineAt(startPosition.line).text;
            let pattern = /(\w+).RunWorkflowEntriesPage\(/gi;
            let variableName = '';
            // Replace with equivalent "Approvals Mgmt." codeunit's RunWorkflowEntriesPage procedure
            const updatedLine = errorLine.replace(pattern, (match, variable) => {
                variableName = variable;
                return 'ApprovalsMgmt.RunWorkflowEntriesPage(';
            });
            updatedContent = content.replace(errorLine, updatedLine);
            if (updatedContent !== content) {
                pattern = new RegExp(`(\\s+)${variableName}\\s*:\\s*\\bRecord\\s+"Workflows Entries Buffer";(\\s+\\w+)`, 'g');
                // Add "Approvals Mgmt." codeunit variable after used before "Workflows Entries Buffer" codeunit variable
                updatedContent = updatedContent.replace(pattern, (match, space, match1) => {
                    if (!match1.includes('ApprovalsMgmt'))
                        return `${space}${variableName}: Record "Workflows Entries Buffer";${space}ApprovalsMgmt: Codeunit "Approvals Mgmt.";${match1}`;
                    return match;
                });
            }
        });
        return updatedContent;
    } catch (error) {
        console.error(`Error refactoring RunWorkflowEntriesPage: ${error}`);
        return content;
    }
}