const { getALFiles, writeFile, getFileContent } = require('../ProjectWorkspaceManagement/workspaceMgt');

module.exports.renameALExtensions = async function (/** @type {string} */ prefix, /** @type {string} */ suffix, /** @type {boolean} */ addExtMarker,/** @type {boolean} */ removeSpaces) {

    let ALfiles = await getALFiles('');
    if (!ALfiles) return;
    if (ALfiles.length === 0)
        return 'No AL files of extension objects found in the src directory.';

    for (const file of ALfiles) {
        const fileContent = await getFileContent(file);
        if (fileContent.startsWith('tableextension ') || fileContent.startsWith('pageextension ') || fileContent.startsWith('reportextension ') || fileContent.startsWith('enumextension ')) {
            const updatedContent = renameALExtensionObject(fileContent, prefix, suffix, addExtMarker, removeSpaces);
            if (updatedContent !== fileContent) {
                // Write the updated content back to the file
                await writeFile(file, updatedContent);
            }
        }
    }
    return 'Extension objects are renamed.';
}

/**
 * Find extension object names and replace with its source object names
 * @param {string} content
 * @param {string} prefix
 * @param {string} suffix
 * @param {boolean} addExtMarker
 * @param {boolean} removeSpaces
 */
function renameALExtensionObject(content, prefix, suffix, addExtMarker, removeSpaces) {
    // Regex pattern for AL extension objects
    const objectPattern = /\b(tableextension|pageextension|reportextension|enumextension|permissionsetextension)\s+\d+\s+("[^"]+"|\w+)\s+extends\s+("[^"]+"|\w+)/g;

    // Declare extension marker when function told to add extension marker
    let extMarker = '';
    if (addExtMarker) extMarker = ' Ext';

    let updatedContent = content.replace(objectPattern, (match, objectType, objectName, objectSource) => {
        // Create extension name from its source without spaces and characters
        let newObjectName = getExtNameFromObjSource(objectSource, prefix, suffix, extMarker);
        if (removeSpaces)
            newObjectName = newObjectName.replace(/[^a-zA-Z_]/g, '');
        return match.replace(objectName, newObjectName);
    });

    return updatedContent;
}
/**
 * @param {string} objectSourceName
 * @param {string} prefix
 * @param {string} suffix
 * @param {string} extMarker
 */
function getExtNameFromObjSource(objectSourceName, prefix, suffix, extMarker) {

    let newObjectName = objectSourceName;
    // Process extension name when object source is closed in quotes
    if (objectSourceName.startsWith('"'))
        newObjectName = objectSourceName.slice(1, -1);

    if (prefix != '')
        newObjectName = `"${prefix}${newObjectName}${extMarker}"`;
    else if (suffix != '')
        newObjectName = `"${newObjectName}${extMarker}${suffix}"`;
    else newObjectName = `"${newObjectName}${extMarker}"`;

    if (!objectSourceName.startsWith('"') && prefix != '' && suffix != '' && extMarker == '')
        if (!prefix.includes(' ') && !suffix.includes(' '))
            // Remove quotes from extension name that hasn't specific characters and spaces
            newObjectName = newObjectName.slice(1, -1);

    return newObjectName;
}


