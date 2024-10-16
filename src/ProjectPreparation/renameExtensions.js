const { getALFiles, writeFile, getFileContent } = require('../ProjectWorkspaceManagement/workspaceMgt');

module.exports.renameALExtensions = async function (/** @type {string} */ afix) {

    let standardALfiles = await getALFiles('src/Standard');

    if (standardALfiles.length === 0)
        return 'No AL files of extension objects found in the src directory.';

    for (const file of standardALfiles) {
        const fileContent = await getFileContent(file);
        const updatedContent = renameALExtensionObject(fileContent, afix);
        if (updatedContent !== fileContent) {
            // Write the updated content back to the file
            await writeFile(file, updatedContent);
        }
    }
    return 'Extension objects are renamed.';
}

/**
 * Find extension object names and replace with its source object names
 * @param {string} content
 * @param {string} afix - already added to the name of extension
 */
function renameALExtensionObject(content, afix) {
    // Regex pattern for AL extension objects
    const objectPattern = /\b(tableextension|pageextension|reportextension|enumextension|permissionsetextension)\s+\d+\s+("[^"]+"|\w+)\s+extends\s+("[^"]+"|\w+)/g;

    let updatedContent = content.replace(objectPattern, (match, objectType, objectName, objectSource) => {
        // Rename with prefix added
        if (afix !== '' && objectName.startsWith(`${afix}_`)) {
            if (objectSource.startsWith('"'))
                return match.replace(objectName, `"${afix}_${objectSource.slice(1, -1)}"`);
            return match.replace(objectName, `${afix}_${objectSource}`);
        }
        // Rename with sufix added
        else if (afix !== '' && objectName.endsWith(`_${afix}`)) {
            if (objectSource.startsWith('"'))
                return match.replace(objectName, `"${objectSource.slice(1, -1)}_${afix}"`);
            return match.replace(objectName, `${objectSource}_${afix}`);
        }
        // Rename extension without afix
        return match.replace(objectName, objectSource);
    });

    return updatedContent;
}



