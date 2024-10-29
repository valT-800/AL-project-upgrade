const { getALFiles, writeFile, getFileContent } = require('../ProjectWorkspaceManagement/workspaceMgt');

module.exports.renameALExtensions = async function (/** @type {string} */ prefix, /** @type {string} */ suffix, /** @type {boolean} */ addExtMarker) {

    let standardALfiles = await getALFiles('src/Standard');
    if (!standardALfiles) return;
    if (standardALfiles.length === 0)
        return 'No AL files of extension objects found in the src directory.';

    for (const file of standardALfiles) {
        const fileContent = await getFileContent(file);
        const updatedContent = renameALExtensionObject(fileContent, prefix, suffix, addExtMarker);
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
 * @param {string} prefix
 * @param {string} suffix
 * @param {boolean} addExtMarker
 */
function renameALExtensionObject(content, prefix, suffix, addExtMarker) {
    // Regex pattern for AL extension objects
    const objectPattern = /\b(tableextension|pageextension|reportextension|enumextension|permissionsetextension)\s+\d+\s+("[^"]+"|\w+)\s+extends\s+("[^"]+"|\w+)/g;

    // Declare extension marker when function told to add extension marker
    let extMarker = '';
    if (addExtMarker) extMarker = ' Ext.';

    const addSuffixToExtensionName = (/** @type {string} */ extensionName, /** @type {string} */ suffix) => {

        if (extensionName.startsWith('"'))
            return `"${extensionName.slice(1, -1)}${suffix}"`;
        else {
            return `${extensionName}${suffix}`;
        }
    }

    const addPrefixToExtensionName = (/** @type {string} */ extensionName, /** @type {string} */ prefix) => {

        if (extensionName.startsWith('"'))
            return `"${prefix}${extensionName.slice(1, -1)}"`;
        else {
            return `${prefix}${extensionName}`;
        }
    }

    let updatedContent = content.replace(objectPattern, (match, objectType, objectName, objectSource) => {
        let newObjectName = objectSource;
        if (objectSource.startsWith('"'))
            newObjectName = `"${objectSource.slice(1, -1)}${extMarker}"`;
        else {
            if (addExtMarker) newObjectName = `"${objectSource}${extMarker}"`;
        }
        if (prefix != '')
            newObjectName = addPrefixToExtensionName(newObjectName, prefix);
        else if (suffix != '')
            newObjectName = addSuffixToExtensionName(newObjectName, suffix);

        return match.replace(objectName, newObjectName);
    });

    return updatedContent;
}



