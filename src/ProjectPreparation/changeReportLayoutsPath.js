const { getALFiles, writeFile, getFileContent } = require('../ProjectWorkspaceManagement/workspaceMgt.js');

module.exports.changeReportsLayoutPath = async function () {
    const ALfiles = await getALFiles('src');
    if (!ALfiles) return;
    if (ALfiles.length === 0)
        return 'No AL files found in the src directory.';

    // Go through every src directory AL file
    for (const file of ALfiles) {
        const fileContent = await getFileContent(file);
        const updatedContent = changeLayoutPath(fileContent);
        if (updatedContent !== fileContent) {
            // Write the updated content back to the file
            await writeFile(file, updatedContent);
        }
    }
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