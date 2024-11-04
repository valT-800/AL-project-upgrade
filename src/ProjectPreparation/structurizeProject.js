const { createFolder, folderExists, getAllFiles, moveFile, getFileContent } = require("../ProjectWorkspaceManagement/workspaceMgt");

module.exports.structurizeProject = async function () {

    // Create src folder if it not exists
    let folderExist = await folderExists('SRC');
    if (!folderExist) createFolder('SRC');
    // Create folder, when it not exists, for custom objects or stop the function
    folderExist = await folderExists('SRC/Custom');
    if (!folderExist) createFolder('SRC/Custom');
    else return;
    // Create folder, when it not exists, for standard object extensions and copies or stop the function
    folderExist = await folderExists('SRC/Standard');
    if (!folderExist) createFolder('SRC/Standard');
    else return;
    // Get all files stored in project root folder
    const files = await getAllFiles();
    if (files.length === 0) return 'No files found in the workspace!';
    // Go through every file
    for (const file of files) {
        const fileContent = await getFileContent(file);
        // Distribute files into the required folders by the Simplanova template
        if (fileContent.startsWith('table ')) {
            folderExist = await folderExists('SRC/Custom/Tables');
            if (!folderExist)
                createFolder('SRC/Custom/Tables');
            moveFile(file, 'SRC/Custom/Tables');
        } else if (fileContent.startsWith('page ')) {
            folderExist = await folderExists('SRC/Custom/Pages');
            if (!folderExist) createFolder('SRC/Custom/Pages');
            moveFile(file, 'SRC/Custom/Pages');
        } else if (fileContent.startsWith('codeunit ')) {
            folderExist = await folderExists('SRC/Custom/Codeunits');
            if (!folderExist) createFolder('SRC/Custom/Codeunits');
            moveFile(file, 'SRC/Custom/Codeunits');
        }
        else if (fileContent.startsWith('xmlport ')) {
            folderExist = await folderExists('SRC/Custom/XmlPorts');
            if (!folderExist) createFolder('SRC/Custom/XmlPorts');
            moveFile(file, 'SRC/Custom/XmlPorts');
        }
        else if (fileContent.startsWith('query ')) {
            folderExist = await folderExists('SRC/Custom/Queries');
            if (!folderExist) createFolder('SRC/Custom/Queries');
            moveFile(file, 'SRC/Custom/Queries');
        }
        else if (fileContent.startsWith('report ')) {
            folderExist = await folderExists('SRC/Custom/Reports');
            if (!folderExist) createFolder('SRC/Custom/Reports');
            moveFile(file, 'SRC/Custom/Reports');
        }
        else if (file.endsWith('.rdlc')) {
            folderExist = await folderExists('SRC/Custom/Reports');
            if (!folderExist) createFolder('SRC/Custom/Reports');
            folderExist = await folderExists('SRC/Custom/Reports/RdlcLayouts');
            if (!folderExist) createFolder('SRC/Custom/Reports/RdlcLayouts');
            moveFile(file, 'SRC/Custom/Reports/RdlcLayouts');
        }
        else if (file.endsWith('.docx')) {
            folderExist = await folderExists('SRC/Custom/Reports');
            if (!folderExist) createFolder('SRC/Custom/Reports');
            folderExist = await folderExists('SRC/Custom/Reports/WordLayouts');
            if (!folderExist) createFolder('SRC/Custom/Reports/WordLayouts');
            moveFile(file, 'SRC/Custom/Reports/WordLayouts');
        }
        else if (fileContent.startsWith('pageextension ')) {
            if (!folderExist) createFolder('SRC/Standard/PageExtensions');
            moveFile(file, 'SRC/Standard/PageExtensions');
        }
        else if (fileContent.startsWith('tableextension ')) {
            if (!folderExist) createFolder('SRC/Standard/TableExtensions');
            moveFile(file, 'SRC/Standard/TableExtensions');
        }
    }
    return 'Project structurized.';
}