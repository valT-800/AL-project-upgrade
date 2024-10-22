const { getALFiles, writeFile, getFileContent } = require('../ProjectWorkspaceManagement/workspaceMgt.js');

module.exports.addApplicationArea = async function () {

    const ALfiles = await getALFiles('src');
    if (!ALfiles) return;
    if (ALfiles.length === 0)
        return 'No AL files found in the src directory.';

    // Declare when any files have been changed
    let changed = false;

    // Go through every src directory AL file
    for (const file of ALfiles) {
        // Read and modify the file object name
        const fileContent = await getFileContent(file);
        const updatedContent = addApplicationAreaToPageObjects(fileContent);
        if (updatedContent !== fileContent) {
            // Write the updated content back to the file
            await writeFile(file, updatedContent);
            // Declare file modification
            changed = true;
        }
    }
    if (!changed) return;
    return 'ApplicationArea = All added to all relevant files.';
}

/**
 * @param {string} content
 */
function addApplicationAreaToPageObjects(content) {

    //Regular expressions to match pages, reports, fields, actions, and parts;
    const objectPattern = /\b(page|report)[^{]*\{[^{]*\{/g;
    const fieldPattern = /\bfield\([^;]*;\s*("[^"]+"|\w+\.("[^"]+"|\w+)|\w+)\s*\)([^{]*)\{[^}]*\}/g;
    const othersPattern = /\b(action|part|systempart)\([^)]*\)([^{]*)\{[^}]*\}/g;

    // Add ApplicationArea = All; to the page or report that has UsageCategory
    let updatedContent = content.replace(objectPattern, (match) => {
        if (!match.includes('ApplicationArea') && match.includes('UsageCategory')) {
            // Add ApplicationArea = All; after open curly braces
            const usageCategory = /\bUsageCategory\s*=\s*[^;]*;/g;
            return match.replace(usageCategory, (m) => `${m}\n    ApplicationArea = All;`);
        }
        return match;
    });

    // Function to add ApplicationArea = All;
    const addApplicationArea = (/** @type {string} */ match, /** @type {string} */ space) => {
        if (!match.includes('ApplicationArea')) {
            // Add ApplicationArea = All; after open curly braces
            return match.replace(/{/, `{${space}    ApplicationArea = All;`);
        }
        return match;
    };

    // Add ApplicationArea = All; to the page fields
    updatedContent = updatedContent.replace(fieldPattern, (match, m, m2, space) => addApplicationArea(match, space));
    // Add ApplicationArea = All; to the actions and parts
    updatedContent = updatedContent.replace(othersPattern, (match, m, space) => addApplicationArea(match, space));

    return updatedContent;
}