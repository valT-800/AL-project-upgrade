const { getALFiles, writeFile, getFileContent } = require('../ProjectWorkspaceManagement/workspaceMgt.js');

module.exports.changeReportsLayoutPath = async function () {
    const ALReportfiles = await getALFiles('src/Custom/Reports');
    if (!ALReportfiles) return;
    if (ALReportfiles.length === 0)
        return;

    // Declare when any files have been changed
    let changed = false;

    // Go through every custom report file
    for (const file of ALReportfiles) {
        const fileContent = await getFileContent(file);
        const updatedContent = changeLayoutPath(fileContent);
        if (updatedContent !== fileContent) {
            // Write the updated content back to the file
            await writeFile(file, updatedContent);
            // Declare file modification
            changed = true;
        }
    }
    if (!changed) return;
    return 'Reports Layout Path changed.';
}

/**
 * @param {string} content
 */
function changeLayoutPath(content) {
    const layoutPattern = /\b(RDLCLayout|WordLayout|ExcelLayout)\s*=\s*([^;]+);/gi;
    let updatedContent = content.replace(layoutPattern, (match, layoutType, layoutPath) => {
        if (!layoutPath.includes('./SRC/Custom/Reports/')) {
            return match.replace(layoutPath, `'./SRC/Custom/Reports/${layoutType}s/${layoutPath.slice(3)}`);
        }
        return match;
    });
    return updatedContent;
}