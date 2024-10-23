const { getALFiles, writeFile, getFileContent } = require('../ProjectWorkspaceManagement/workspaceMgt');

module.exports.renameALExtensions = async function (/** @type {string} */ affix, /** @type {boolean} */ addExtMarker) {

    let standardALfiles = await getALFiles('src/Standard');
    if (!standardALfiles) return;
    if (standardALfiles.length === 0)
        return 'No AL files of extension objects found in the src directory.';

    for (const file of standardALfiles) {
        const fileContent = await getFileContent(file);
        const updatedContent = renameALExtensionObject(fileContent, affix, addExtMarker);
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
 * @param {string} affix - already added to the name of extension
 * @param {boolean} addExtMarker
 */
function renameALExtensionObject(content, affix, addExtMarker) {
    // Regex pattern for AL extension objects
    const objectPattern = /\b(tableextension|pageextension|reportextension|enumextension|permissionsetextension)\s+\d+\s+("[^"]+"|\w+)\s+extends\s+("[^"]+"|\w+)/g;

    // Declare extension marker when function told to add extension marker
    let extMarker = '';
    if (addExtMarker) extMarker = ' Ext.';

    let updatedContent = content.replace(objectPattern, (match, objectType, objectName, objectSource) => {
        // Rename extension with prefix added
        if (affix !== '' && objectName.includes(`${affix}_`)) {
            if (objectSource.startsWith('"'))
                return match.replace(objectName, `"${affix}_${objectSource.slice(1, -1)}${extMarker}"`);
            else {
                if (addExtMarker) return match.replace(objectName, `"${affix}_${objectSource}${extMarker}"`);
                return match.replace(objectName, `${affix}_${objectSource}`);
            }
        }
        // Rename extension with suffix added
        else if (affix !== '' && objectName.includes(`_${affix}`)) {
            if (objectSource.startsWith('"'))
                return match.replace(objectName, `"${objectSource.slice(1, -1)}${extMarker}_${affix}"`);
            else {
                if (addExtMarker) return match.replace(objectName, `"${objectSource}${extMarker}_${affix}"`);
                return match.replace(objectName, `${objectSource}_${affix}`);
            }
        }
        // Rename extension without affix
        else {
            if (addExtMarker) {
                if (objectSource.startsWith('"'))
                    return match.replace(objectName, `"${objectSource.slice(1, -1)}${extMarker}"`);
                else
                    return match.replace(objectName, `"${objectSource}${extMarker}"`);
            }
            return match.replace(objectName, objectSource);
        }
    });

    return updatedContent;
}



